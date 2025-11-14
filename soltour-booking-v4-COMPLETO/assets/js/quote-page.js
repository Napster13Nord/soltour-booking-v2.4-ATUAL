/**
 * Página de Cotação - BeautyTravel
 * Carrega pacote selecionado e gera cotação
 * ATUALIZADO: Usa os mesmos cards da página de resultados
 */

(function($) {
    'use strict';

    // Namespace global
    window.BeautyTravelQuote = {
        budgetData: null,
        packageDetails: null,
        passengers: []
    };

    // Aguardar DOM ready
    $(document).ready(function() {

        // Verificar se estamos na página de cotação
        const $quotePage = $('#soltour-quote-page');
        if ($quotePage.length === 0) {
            return;
        }

        initQuotePage();
    });

    /**
     * Inicializar página de cotação
     */
    function initQuotePage() {
        // 1. Carregar budget selecionado do sessionStorage
        const selectedBudget = sessionStorage.getItem('soltour_selected_budget');

        if (!selectedBudget) {
            renderError('Nenhum pacote selecionado', 'Por favor, volte à página de resultados e selecione um pacote.');
            return;
        }

        try {
            BeautyTravelQuote.budgetData = JSON.parse(selectedBudget);

            // 2. Buscar detalhes completos do pacote
            loadPackageDetails();

        } catch (error) {
            renderError('Erro ao carregar pacote', 'Os dados do pacote selecionado estão corrompidos.');
        }
    }

    /**
     * Carregar detalhes completos do pacote
     */
    function loadPackageDetails() {
        showLoading();

        const { budgetId, hotelCode, providerCode, availToken } = BeautyTravelQuote.budgetData;

        $.ajax({
            url: soltourData.ajaxurl,
            type: 'POST',
            data: {
                action: 'soltour_get_package_details',
                nonce: soltourData.nonce,
                avail_token: availToken,
                budget_id: budgetId,
                hotel_code: hotelCode,
                provider_code: providerCode
            },
            success: function(response) {

                if (response.success && response.data) {
                    BeautyTravelQuote.packageDetails = response.data;

                    // Renderizar página completa
                    renderQuotePage();

                } else {
                    renderError('Erro ao carregar detalhes', response.data?.message || 'Não foi possível carregar os detalhes do pacote.');
                }
            },
            error: function(xhr, status, error) {
                renderError('Erro de conexão', 'Não foi possível conectar ao servidor. Tente novamente.');
            }
        });
    }

    /**
     * Renderizar página completa de cotação
     */
    function renderQuotePage() {

        const $container = $('#soltour-quote-page');
        const details = BeautyTravelQuote.packageDetails;
        const budget = details.budget || {};

        // Extrair dados para contagem de passageiros
        const passengerCount = getPassengerCount(budget);

        // Preço total
        const price = extractPrice(budget);

        // HTML da página com estrutura de 2 colunas
        const html = `
            <div class="bt-quote-header">
                <h1>💼 Cotação do Seu Pacote</h1>
                <p>Confirme os detalhes e preencha os dados abaixo para receber a sua cotação personalizada</p>
            </div>

            <div class="bt-quote-grid">
                <!-- Coluna Esquerda: Cards do Hotel e Voos -->
                <div class="soltour-left-column">
                    <div id="hotel-card-container"></div>
                    <div id="flight-cards-container"></div>
                </div>

                <!-- Coluna Direita: Sidebar com Preço e Formulário -->
                <div class="soltour-right-column">
                    <!-- Resumo de Preço -->
                    <div class="bt-price-sidebar">
                        <h2>💰 Resumo do Preço</h2>
                        <div class="bt-price-breakdown">
                            <div class="bt-price-line">
                                <span>Preço por pessoa:</span>
                                <span>${(price / passengerCount).toFixed(0)}€</span>
                            </div>
                            <div class="bt-price-line">
                                <span>Número de passageiros:</span>
                                <span>× ${passengerCount}</span>
                            </div>
                        </div>
                        <div class="bt-price-total">
                            <span>Total:</span>
                            <span class="bt-price-total-amount">${price.toFixed(0)}€</span>
                        </div>
                        <div class="bt-price-note">
                            💡 Este é um valor estimado. O preço final será confirmado após o preenchimento dos dados dos passageiros.
                        </div>
                    </div>

                    <!-- Formulário de Passageiros -->
                    <div class="bt-passengers-form">
                        <h2>👥 Dados dos Passageiros</h2>
                        ${renderPassengerForms(passengerCount, budget)}
                    </div>

                    <!-- Observações -->
                    <div class="bt-passengers-form">
                        <h2>📝 Observações (Opcional)</h2>
                        <div class="bt-form-group bt-form-full">
                            <label for="quote-notes">Alguma solicitação especial?</label>
                            <textarea id="quote-notes" name="notes" placeholder="Ex: Quarto com vista para o mar, necessidades especiais, etc."></textarea>
                        </div>
                    </div>

                    <!-- Botão de Gerar Cotação -->
                    <div class="bt-quote-actions">
                        <button type="button" class="bt-btn-generate-quote" id="btn-generate-quote">
                            <i class="fas fa-file-invoice"></i>
                            Gerar Cotação Final
                        </button>
                    </div>
                </div>
            </div>
        `;

        $container.html(html);

        // Renderizar cards do hotel e voos usando a mesma lógica da página de resultados
        renderHotelCard(budget, details);
        renderFlightCards(budget);

        // Bind eventos
        bindQuoteEvents();

    }

    /**
     * Renderizar card do hotel usando a mesma estrutura da página de resultados
     */
    function renderHotelCard(budget, details) {
        const hotelService = budget.hotelServices && budget.hotelServices[0];

        if (!hotelService) {
            $('#hotel-card-container').html('<p>Informações do hotel não disponíveis.</p>');
            return;
        }

        // Extrair quartos disponíveis
        let availableRooms = [];
        if (hotelService.mealPlan && hotelService.mealPlan.combination && hotelService.mealPlan.combination.rooms) {
            availableRooms = hotelService.mealPlan.combination.rooms;
        }

        // Imagens
        let hotelImages = [];
        if (details.hotelDetails && details.hotelDetails.hotel && details.hotelDetails.hotel.multimedias) {
            details.hotelDetails.hotel.multimedias.forEach(m => {
                if (m.type === 'IMAGE' && m.url) {
                    hotelImages.push(m.url);
                }
            });
        }
        hotelImages = hotelImages.slice(0, 10);

        // Nome do hotel
        const hotelName = details.hotelDetails?.hotel?.commercialName ||
                         details.hotelDetails?.hotel?.name ||
                         'Hotel';

        // Localização
        const country = getCountryFromDestination(details.hotelDetails?.hotel?.destinationCode);
        const city = details.hotelDetails?.hotel?.destinationDescription ||
                    getCityFromDestination(details.hotelDetails?.hotel?.destinationCode);

        // Estrelas
        let hotelStars = 0;
        if (details.hotelDetails?.hotel?.categoryCode) {
            hotelStars = (details.hotelDetails.hotel.categoryCode.match(/\*/g) || []).length;
        }

        // Descrição
        let hotelDescriptionFull = details.hotelDetails?.hotel?.description ||
                                  details.hotelDetails?.hotel?.shortDescription || '';
        let hotelDescriptionShort = '';
        let hasMoreDescription = false;
        if (hotelDescriptionFull.length > 150) {
            hotelDescriptionShort = hotelDescriptionFull.substring(0, 150) + '...';
            hasMoreDescription = true;
        } else {
            hotelDescriptionShort = hotelDescriptionFull;
        }

        // Noites e regime
        const numNights = getNumNights(budget);
        const mealPlan = getMealPlan(budget);

        // Datas
        const { startDate, endDate } = getDates(budget);

        // Construir slider de imagens
        let sliderHTML = '';
        if (hotelImages.length > 0) {
            sliderHTML = `
                <div class="package-image-slider">
                    <div class="slider-images">
                        ${hotelImages.map((img, index) => `
                            <img src="${img}" alt="${hotelName}" class="slider-image ${index === 0 ? 'active' : ''}" />
                        `).join('')}
                    </div>
                    ${hotelImages.length > 1 ? `
                        <button class="slider-btn slider-prev" onclick="BeautyTravelQuote.changeSlide(this, -1)">❮</button>
                        <button class="slider-btn slider-next" onclick="BeautyTravelQuote.changeSlide(this, 1)">❯</button>
                        <div class="slider-dots">
                            ${hotelImages.map((_, index) => `
                                <span class="slider-dot ${index === 0 ? 'active' : ''}" onclick="BeautyTravelQuote.goToSlide(this, ${index})"></span>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="package-badge">HOTEL</div>
                </div>
            `;
        } else {
            sliderHTML = `
                <div class="package-image">
                    <div class="no-image">📷 Sem imagem</div>
                    <div class="package-badge">HOTEL</div>
                </div>
            `;
        }

        // Construir card do hotel
        const hotelCard = `
            <div class="quote-section-title">
                <h2>🏨 Hotel Selecionado</h2>
            </div>
            <div class="soltour-package-card">
                ${sliderHTML}
                <div class="package-info">
                    <div class="package-location">
                        <strong>${country}</strong>
                        <span class="package-city">${city}</span>
                    </div>
                    <h3 class="package-name">${hotelName}</h3>
                    <div class="package-stars">
                        ${hotelStars > 0 ? '⭐'.repeat(hotelStars) : '<span class="no-rating">Hotel</span>'}
                    </div>
                    ${hotelDescriptionShort ? `
                        <div class="package-description">
                            <p class="description-text">
                                <span class="description-short">${hotelDescriptionShort}</span>
                                ${hasMoreDescription ? `
                                    <span class="description-full" style="display: none;">${hotelDescriptionFull}</span>
                                    <a href="javascript:void(0)" class="read-more-btn" onclick="BeautyTravelQuote.toggleDescription(this)">ler mais</a>
                                ` : ''}
                            </p>
                        </div>
                    ` : ''}
                    <div class="package-details">
                        <p>🌙 ${numNights} Noites | ${mealPlan}</p>
                        <p>📅 ${startDate} - ${endDate}</p>
                    </div>

                    ${availableRooms.length > 0 ? `
                        <!-- QUARTOS DISPONÍVEIS -->
                        <div class="available-rooms-section">
                            <h4 class="rooms-title">🛏️ Quartos Disponíveis</h4>
                            <div class="rooms-list">
                                ${availableRooms.map((room, index) => {
                                    const roomPrice = room.priceDetails && room.priceDetails.pvp ? room.priceDetails.pvp : 0;
                                    const roomDescription = room.description || 'Quarto';
                                    const numRoomPassengers = room.passengers ? room.passengers.length : 0;
                                    const roomPricePerPerson = numRoomPassengers > 0 ? (roomPrice / numRoomPassengers) : roomPrice;

                                    return `
                                        <div class="room-option">
                                            <div class="room-info">
                                                <div class="room-name">${roomDescription}</div>
                                                <div class="room-occupancy">👥 ${numRoomPassengers} passageiro${numRoomPassengers !== 1 ? 's' : ''}</div>
                                            </div>
                                            <div class="room-pricing">
                                                <div class="room-price-per-person">${roomPricePerPerson.toFixed(0)}€/pax</div>
                                                <div class="room-price-total">${roomPrice.toFixed(0)}€ total</div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        $('#hotel-card-container').html(hotelCard);
    }

    /**
     * Renderizar cards dos voos (separados: ida e volta)
     */
    function renderFlightCards(budget) {
        const flightServices = budget.flightServices || [];

        if (flightServices.length === 0) {
            $('#flight-cards-container').html('');
            return;
        }

        let flightCardsHTML = `
            <div class="quote-section-title">
                <h2>✈️ Voos Incluídos</h2>
            </div>
        `;

        flightServices.forEach(function(flight) {
            const flightType = flight.type === 'OUTBOUND' ? 'Ida' : 'Regresso';
            const flightIcon = flight.type === 'OUTBOUND' ? '🛫' : '🛬';

            if (!flight.segments || flight.segments.length === 0) {
                return;
            }

            const firstSegment = flight.segments[0];
            const lastSegment = flight.segments[flight.segments.length - 1];

            const origin = firstSegment.origin || '';
            const destination = lastSegment.destination || '';
            const departureTime = firstSegment.departureTime ? firstSegment.departureTime.substring(0, 5) : '--:--';
            const arrivalTime = lastSegment.arrivalTime ? lastSegment.arrivalTime.substring(0, 5) : '--:--';
            const airline = firstSegment.carrierName || firstSegment.carrier || 'Companhia Aérea';
            const carrierCode = firstSegment.carrier || '';

            // Data do voo
            let flightDate = '';
            if (firstSegment.departureDate) {
                flightDate = formatDate(firstSegment.departureDate);
            }

            // Logo da companhia aérea
            let airlineLogo = firstSegment.carrierLogo || firstSegment.carrierImageUrl || '';
            if (!airlineLogo && carrierCode) {
                airlineLogo = `https://images.kiwi.com/airlines/64/${carrierCode}.png`;
            }

            // Escalas
            const numStops = flight.segments.length - 1;
            const stopsText = numStops === 0 ? 'Voo direto' :
                            numStops === 1 ? '1 escala' :
                            `${numStops} escalas`;

            flightCardsHTML += `
                <div class="flight-card">
                    <div class="flight-card-header">
                        <div class="flight-type-badge">${flightIcon} ${flightType}</div>
                        <div class="flight-date">${flightDate}</div>
                    </div>
                    <div class="flight-card-body">
                        <div class="flight-airline-info">
                            ${airlineLogo ? `<img src="${airlineLogo}" alt="${airline}" class="flight-airline-logo" onerror="this.style.display='none'" />` : ''}
                            <span class="flight-airline-name">${airline}</span>
                        </div>
                        <div class="flight-route-info">
                            <div class="flight-time-location">
                                <div class="flight-time">${departureTime}</div>
                                <div class="flight-location">${origin}</div>
                            </div>
                            <div class="flight-route-line">
                                <div class="flight-stops-info">${stopsText}</div>
                                <div class="flight-arrow">→</div>
                            </div>
                            <div class="flight-time-location">
                                <div class="flight-time">${arrivalTime}</div>
                                <div class="flight-location">${destination}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        $('#flight-cards-container').html(flightCardsHTML);
    }

    /**
     * Renderizar formulários de passageiros
     */
    function renderPassengerForms(count, budget) {
        let html = '';

        // Calcular quantos adultos e crianças
        const hotelService = budget.hotelServices?.[0];
        const adults = hotelService?.adults || count;
        const children = hotelService?.children || 0;

        // Adultos
        for (let i = 1; i <= adults; i++) {
            html += `
                <div class="bt-form-section">
                    <h3>👤 Adulto ${i} <span class="bt-passenger-badge">Titular ${i === 1 ? '(Responsável)' : ''}</span></h3>
                    <div class="bt-form-row">
                        <div class="bt-form-group">
                            <label for="adult-${i}-firstname">Nome <span class="required">*</span></label>
                            <input type="text" id="adult-${i}-firstname" name="adult_${i}_firstname" required />
                        </div>
                        <div class="bt-form-group">
                            <label for="adult-${i}-lastname">Apelido <span class="required">*</span></label>
                            <input type="text" id="adult-${i}-lastname" name="adult_${i}_lastname" required />
                        </div>
                    </div>
                    <div class="bt-form-row">
                        <div class="bt-form-group">
                            <label for="adult-${i}-birthdate">Data de Nascimento <span class="required">*</span></label>
                            <input type="date" id="adult-${i}-birthdate" name="adult_${i}_birthdate" required max="${getMaxBirthdate(18)}" />
                        </div>
                        <div class="bt-form-group">
                            <label for="adult-${i}-document">Documento (Passaporte/BI) <span class="required">*</span></label>
                            <input type="text" id="adult-${i}-document" name="adult_${i}_document" required />
                        </div>
                    </div>
                    ${i === 1 ? `
                        <div class="bt-form-row">
                            <div class="bt-form-group">
                                <label for="adult-1-email">Email <span class="required">*</span></label>
                                <input type="email" id="adult-1-email" name="adult_1_email" required />
                            </div>
                            <div class="bt-form-group">
                                <label for="adult-1-phone">Telefone <span class="required">*</span></label>
                                <input type="tel" id="adult-1-phone" name="adult_1_phone" required placeholder="+351 912 345 678" />
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Crianças
        for (let i = 1; i <= children; i++) {
            html += `
                <div class="bt-form-section">
                    <h3>👶 Criança ${i} <span class="bt-passenger-badge">Menor</span></h3>
                    <div class="bt-form-row">
                        <div class="bt-form-group">
                            <label for="child-${i}-firstname">Nome <span class="required">*</span></label>
                            <input type="text" id="child-${i}-firstname" name="child_${i}_firstname" required />
                        </div>
                        <div class="bt-form-group">
                            <label for="child-${i}-lastname">Apelido <span class="required">*</span></label>
                            <input type="text" id="child-${i}-lastname" name="child_${i}_lastname" required />
                        </div>
                    </div>
                    <div class="bt-form-row">
                        <div class="bt-form-group">
                            <label for="child-${i}-birthdate">Data de Nascimento <span class="required">*</span></label>
                            <input type="date" id="child-${i}-birthdate" name="child_${i}_birthdate" required min="${getMaxBirthdate(18)}" max="${getMaxBirthdate(0)}" />
                        </div>
                        <div class="bt-form-group">
                            <label for="child-${i}-document">Documento (Passaporte/BI) <span class="required">*</span></label>
                            <input type="text" id="child-${i}-document" name="child_${i}_document" required />
                        </div>
                    </div>
                </div>
            `;
        }

        return html;
    }

    /**
     * Bind eventos da página
     */
    function bindQuoteEvents() {
        // Botão de gerar cotação
        $('#btn-generate-quote').off('click').on('click', function() {
            generateFinalQuote();
        });
    }

    /**
     * Gerar cotação final
     */
    function generateFinalQuote() {

        // Validar formulário
        const formData = collectFormData();

        if (!formData) {
            alert('⚠️ Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Desabilitar botão
        const $btn = $('#btn-generate-quote');
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> A gerar cotação...');

        // Enviar para o servidor
        $.ajax({
            url: soltourData.ajaxurl,
            type: 'POST',
            data: {
                action: 'soltour_generate_quote',
                nonce: soltourData.nonce,
                budget_data: BeautyTravelQuote.budgetData,
                passengers: formData.passengers,
                notes: formData.notes
            },
            success: function(response) {

                if (response.success) {
                    // Mostrar mensagem de sucesso
                    alert('✅ Cotação gerada com sucesso!\n\nEm breve receberá um email com os detalhes do seu pacote.');

                    // Limpar sessionStorage
                    sessionStorage.removeItem('soltour_selected_budget');

                    // Redirecionar para página inicial ou confirmação
                    window.location.href = '/';

                } else {
                    alert('❌ Erro ao gerar cotação: ' + (response.data?.message || 'Erro desconhecido'));
                    $btn.prop('disabled', false).html('<i class="fas fa-file-invoice"></i> Gerar Cotação Final');
                }
            },
            error: function(xhr, status, error) {
                alert('❌ Erro de conexão. Por favor, tente novamente.');
                $btn.prop('disabled', false).html('<i class="fas fa-file-invoice"></i> Gerar Cotação Final');
            }
        });
    }

    /**
     * Coletar dados do formulário
     */
    function collectFormData() {
        const passengers = [];

        // Pegar todos os inputs do formulário
        $('.bt-form-section').each(function() {
            const $section = $(this);
            const title = $section.find('h3').text();

            // Extrair dados do passageiro
            const firstName = $section.find('input[name*="firstname"]').val()?.trim();
            const lastName = $section.find('input[name*="lastname"]').val()?.trim();
            const birthDate = $section.find('input[name*="birthdate"]').val();
            const document = $section.find('input[name*="document"]').val()?.trim();
            const email = $section.find('input[name*="email"]').val()?.trim();
            const phone = $section.find('input[name*="phone"]').val()?.trim();

            // Validar campos obrigatórios
            if (!firstName || !lastName || !birthDate || !document) {
                return false; // Inválido
            }

            passengers.push({
                type: title.includes('Adulto') ? 'adult' : 'child',
                firstName: firstName,
                lastName: lastName,
                birthDate: birthDate,
                document: document,
                email: email || null,
                phone: phone || null,
                isMainPassenger: email ? true : false
            });
        });

        // Verificar se todos os passageiros foram preenchidos
        if (passengers.length === 0 || passengers.some(p => !p.firstName)) {
            return null;
        }

        return {
            passengers: passengers,
            notes: $('#quote-notes').val()?.trim() || ''
        };
    }

    /**
     * Mostrar loading
     */
    function showLoading() {
        const html = `
            <div class="bt-quote-loading">
                <div class="spinner"></div>
                <h3>A carregar detalhes...</h3>
                <p>Aguarde enquanto buscamos as informações do seu pacote</p>
            </div>
        `;
        $('#soltour-quote-page').html(html);
    }

    /**
     * Mostrar erro
     */
    function renderError(title, message) {
        const html = `
            <div class="bt-quote-error">
                <h3>❌ ${title}</h3>
                <p>${message}</p>
                <button type="button" class="bt-btn-back" onclick="window.history.back()">
                    ← Voltar
                </button>
            </div>
        `;
        $('#soltour-quote-page').html(html);
    }

    // ===========================
    // FUNÇÕES AUXILIARES
    // ===========================

    function extractPrice(budget) {
        if (budget.priceBreakdown?.priceBreakdownDetails?.[0]?.priceInfo?.pvp) {
            return budget.priceBreakdown.priceBreakdownDetails[0].priceInfo.pvp;
        }
        return 0;
    }

    function getPassengerCount(budget) {
        const hotelService = budget.hotelServices?.[0];
        const adults = hotelService?.adults || 2;
        const children = hotelService?.children || 0;
        return adults + children;
    }

    function getNumNights(budget) {
        const hotelService = budget.hotelServices?.[0];
        if (hotelService?.nights) return hotelService.nights;

        // Calcular pela diferença de datas
        const startDate = hotelService?.checkIn || hotelService?.startDate;
        const endDate = hotelService?.checkOut || hotelService?.endDate;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        }

        return 7; // Default
    }

    function getMealPlan(budget) {
        const hotelService = budget.hotelServices?.[0];
        const mealPlan = hotelService?.mealPlan;

        if (typeof mealPlan === 'string') return mealPlan;
        if (mealPlan?.description) return mealPlan.description;
        if (mealPlan?.code) {
            const codes = {
                'AI': 'Tudo Incluído',
                'PC': 'Pensão Completa',
                'MP': 'Meia Pensão',
                'BB': 'Pequeno Almoço',
                'RO': 'Só Alojamento'
            };
            return codes[mealPlan.code] || mealPlan.code;
        }

        return 'Não especificado';
    }

    function getDates(budget) {
        const hotelService = budget.hotelServices?.[0];
        const startDate = hotelService?.checkIn || hotelService?.startDate;
        const endDate = hotelService?.checkOut || hotelService?.endDate;

        return {
            startDate: startDate ? formatDate(startDate) : 'N/A',
            endDate: endDate ? formatDate(endDate) : 'N/A'
        };
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function getMaxBirthdate(yearsAgo) {
        const date = new Date();
        date.setFullYear(date.getFullYear() - yearsAgo);
        return date.toISOString().split('T')[0];
    }

    function getCountryFromDestination(code) {
        const DESTINATIONS_MAP = {
            'PUJ': 'República Dominicana',
            'CUN': 'México',
            'PMI': 'Espanha',
            'BCN': 'Espanha',
            'MAD': 'Espanha',
            'FAO': 'Portugal',
            'FNC': 'Portugal',
            'AGA': 'Marrocos',
            'SSH': 'Egito'
        };
        return DESTINATIONS_MAP[code] || '';
    }

    function getCityFromDestination(code) {
        const CITIES_MAP = {
            'PUJ': 'Punta Cana',
            'CUN': 'Cancún',
            'PMI': 'Palma de Maiorca',
            'BCN': 'Barcelona',
            'MAD': 'Madrid',
            'FAO': 'Faro',
            'FNC': 'Funchal',
            'AGA': 'Agadir',
            'SSH': 'Sharm el-Sheikh'
        };
        return CITIES_MAP[code] || '';
    }

    // ===========================
    // FUNÇÕES DE SLIDER (mesmas da página de resultados)
    // ===========================

    BeautyTravelQuote.changeSlide = function(button, direction) {
        const slider = $(button).closest('.package-image-slider');
        const images = slider.find('.slider-image');
        const dots = slider.find('.slider-dot');

        let currentIndex = 0;
        images.each(function(index) {
            if ($(this).hasClass('active')) {
                currentIndex = index;
            }
        });

        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = images.length - 1;
        if (newIndex >= images.length) newIndex = 0;

        images.removeClass('active');
        dots.removeClass('active');
        $(images[newIndex]).addClass('active');
        $(dots[newIndex]).addClass('active');
    };

    BeautyTravelQuote.goToSlide = function(dot, index) {
        const slider = $(dot).closest('.package-image-slider');
        const images = slider.find('.slider-image');
        const dots = slider.find('.slider-dot');

        images.removeClass('active');
        dots.removeClass('active');
        $(images[index]).addClass('active');
        $(dots[index]).addClass('active');
    };

    BeautyTravelQuote.toggleDescription = function(link) {
        const $link = $(link);
        const $container = $link.closest('.description-text');
        const $short = $container.find('.description-short');
        const $full = $container.find('.description-full');

        if ($full.is(':visible')) {
            $full.hide();
            $short.show();
            $link.text('ler mais');
        } else {
            $short.hide();
            $full.show();
            $link.text('ler menos');
        }
    };

})(jQuery);
