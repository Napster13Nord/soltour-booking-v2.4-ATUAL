/**
 * Página de Cotação - BeautyTravel
 * Carrega pacote selecionado e gera cotação
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
        // 1. Carregar pacote selecionado do sessionStorage (CORRIGIDO: soltour_selected_package)
        const selectedPackage = sessionStorage.getItem('soltour_selected_package');

        if (!selectedPackage) {
            renderError('Nenhum pacote selecionado', 'Por favor, volte à página de resultados e selecione um pacote.');
            return;
        }

        try {
            const packageData = JSON.parse(selectedPackage);

            // Verificar se temos todos os dados necessários (APENAS do availability)
            if (!packageData.budget || !packageData.selectedRoom) {
                renderError('Dados incompletos', 'Os dados do pacote estão incompletos. Por favor, selecione novamente.');
                return;
            }

            // Salvar dados no objeto global
            BeautyTravelQuote.packageData = packageData;

            // Renderizar página completa diretamente (SEM AJAX - apenas dados do availability)
            renderQuotePage();

        } catch (error) {
            console.error('Erro ao carregar pacote:', error);
            renderError('Erro ao carregar pacote', 'Os dados do pacote selecionado estão corrompidos.');
        }
    }

    /**
     * Renderizar página completa de cotação
     */
    function renderQuotePage() {

        const $container = $('#soltour-quote-page');
        const packageData = BeautyTravelQuote.packageData;
        const budget = packageData.budget || {};
        const selectedRoom = packageData.selectedRoom || {};
        const hotelService = budget.hotelServices && budget.hotelServices[0];

        // USAR APENAS DADOS DO AVAILABILITY (budget)
        // NÃO usar details.hotelDetails que vem de chamada separada

        // Extrair dados do hotel do BUDGET
        const hotelCode = hotelService?.hotelCode || '';
        const hotelName = hotelService?.hotelName || 'Hotel';

        // Se temos dados do availability salvos, usar eles
        let hotelImage = '';
        let hotelLocation = '';
        let hotelStars = 0;

        if (packageData.hotelInfo) {
            // Usar dados do hotelsFromAvailability que foram salvos
            hotelImage = packageData.hotelInfo.mainImage || '';
            hotelLocation = `${packageData.hotelInfo.destinationName || ''}, ${packageData.hotelInfo.countryName || ''}`.trim();
            const categoryCode = packageData.hotelInfo.categoryCode || '';
            hotelStars = (categoryCode.match(/\*/g) || []).length;
        }

        // Preço
        const price = extractPrice(budget);
        const pricePerPerson = price / (getPassengerCount(budget));

        // Noites
        const numNights = getNumNights(budget);

        // Voos
        const flightServices = budget.flightServices || [];

        // Meal plan
        const mealPlan = getMealPlan(budget);

        // Datas
        const { startDate, endDate } = getDates(budget);

        // Passageiros
        const passengerCount = getPassengerCount(budget);

        // HTML da página
        const html = `
            <div class="bt-quote-header">
                <h1>💼 Cotação do Seu Pacote</h1>
                <p>Preencha os dados abaixo para receber sua cotação personalizada</p>
            </div>

            <div class="bt-quote-grid">
                <!-- Resumo do Pacote -->
                <div class="bt-package-summary">
                    <h2>📦 Resumo do Pacote</h2>

                    <!-- Hotel -->
                    <div class="bt-summary-section">
                        <h3>🏨 Hotel</h3>
                        <div class="bt-hotel-info">
                            ${hotelImage ? `<img src="${hotelImage}" alt="${hotelName}" class="bt-hotel-image">` : ''}
                            <div class="bt-hotel-details">
                                <h4 class="bt-hotel-name">${hotelName}</h4>
                                <p class="bt-hotel-location">${hotelLocation}</p>
                                <div class="bt-hotel-stars">${hotelStars > 0 ? '⭐'.repeat(hotelStars) : 'Hotel'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Voos -->
                    ${flightServices.length > 0 ? `
                        <div class="bt-summary-section">
                            <h3>✈️ Voos</h3>
                            ${renderFlightsSummary(flightServices)}
                        </div>
                    ` : ''}

                    <!-- Informações -->
                    <div class="bt-summary-section">
                        <h3>ℹ️ Informações</h3>
                        <div class="bt-info-row">
                            <span class="bt-info-label">Check-in:</span>
                            <span class="bt-info-value">${startDate}</span>
                        </div>
                        <div class="bt-info-row">
                            <span class="bt-info-label">Check-out:</span>
                            <span class="bt-info-value">${endDate}</span>
                        </div>
                        <div class="bt-info-row">
                            <span class="bt-info-label">Noites:</span>
                            <span class="bt-info-value">${numNights}</span>
                        </div>
                        <div class="bt-info-row">
                            <span class="bt-info-label">Regime:</span>
                            <span class="bt-info-value">${mealPlan}</span>
                        </div>
                        <div class="bt-info-row">
                            <span class="bt-info-label">Passageiros:</span>
                            <span class="bt-info-value">${passengerCount} pessoa${passengerCount > 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    <!-- Quarto Selecionado -->
                    <div class="bt-summary-section">
                        <h3>🛏️ Acomodação</h3>
                        <div class="bt-room-selected">
                            <div class="bt-room-name">${selectedRoom.description || 'Quarto'}</div>
                            <div class="bt-room-occupancy">
                                👥 ${selectedRoom.passengers ? selectedRoom.passengers.length : 0} passageiro${(selectedRoom.passengers && selectedRoom.passengers.length !== 1) ? 's' : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sidebar de Preço -->
                <div class="bt-price-sidebar">
                    <h2>💰 Preço</h2>
                    <div class="bt-price-breakdown">
                        <div class="bt-price-line">
                            <span>Preço por pessoa:</span>
                            <span>${pricePerPerson.toFixed(0)}€</span>
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
        `;

        $container.html(html);

        // Bind eventos
        bindQuoteEvents();

    }

    /**
     * Renderizar resumo de voos
     */
    function renderFlightsSummary(flights) {
        let html = '';

        const outbound = flights.find(f => f.type === 'OUTBOUND');
        const inbound = flights.find(f => f.type === 'INBOUND');

        if (outbound) {
            const segments = outbound.flightSegments || [];
            const airline = segments[0]?.operatingAirline || 'Companhia Aérea';
            const route = `${segments[0]?.originAirportCode} → ${segments[segments.length - 1]?.destinationAirportCode}`;
            const departure = formatTime(segments[0]?.departureDate);
            const arrival = formatTime(segments[segments.length - 1]?.arrivalDate);

            html += `
                <div class="bt-flight-item">
                    <div class="bt-flight-type">🛫 Saída</div>
                    <div class="bt-flight-route">${airline} - ${route}</div>
                    <div class="bt-flight-time">${departure} - ${arrival}</div>
                </div>
            `;
        }

        if (inbound) {
            const segments = inbound.flightSegments || [];
            const airline = segments[0]?.operatingAirline || 'Companhia Aérea';
            const route = `${segments[0]?.originAirportCode} → ${segments[segments.length - 1]?.destinationAirportCode}`;
            const departure = formatTime(segments[0]?.departureDate);
            const arrival = formatTime(segments[segments.length - 1]?.arrivalDate);

            html += `
                <div class="bt-flight-item">
                    <div class="bt-flight-type">🛬 Regresso</div>
                    <div class="bt-flight-route">${airline} - ${route}</div>
                    <div class="bt-flight-time">${departure} - ${arrival}</div>
                </div>
            `;
        }

        return html;
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
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Gerando cotação...');

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
                <h3>Carregando detalhes...</h3>
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

    function getHotelMainImage(hotel) {
        if (hotel.mainImage) return hotel.mainImage;
        if (hotel.images && hotel.images.length > 0) return hotel.images[0];
        if (hotel.multimedias && hotel.multimedias.length > 0) {
            const img = hotel.multimedias.find(m => m.type === 'IMAGE');
            if (img) return img.url;
        }
        return null;
    }

    function getHotelLocation(hotel) {
        if (hotel.destinationDescription) return hotel.destinationDescription;
        if (hotel.address) {
            if (typeof hotel.address === 'string') return hotel.address;
            if (hotel.address.city) return hotel.address.city;
        }
        return 'Localização não disponível';
    }

    function getHotelStars(hotel) {
        if (hotel.categoryCode) {
            return (hotel.categoryCode.match(/\*/g) || []).length;
        }
        return 0;
    }

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

    function formatTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    }

    function getMaxBirthdate(yearsAgo) {
        const date = new Date();
        date.setFullYear(date.getFullYear() - yearsAgo);
        return date.toISOString().split('T')[0];
    }

})(jQuery);
