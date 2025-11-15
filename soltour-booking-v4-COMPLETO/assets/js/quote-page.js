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
            BeautyTravelQuote.budgetData = packageData; // Salvar packageData completo para envio ao servidor

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
        const selectedRooms = packageData.selectedRooms || [selectedRoom]; // Array com todos os quartos
        const numRoomsSearched = packageData.numRoomsSearched || 1;
        const hotelService = budget.hotelServices && budget.hotelServices[0];

        // ==============================================
        // DEBUG AVANÇADO - Requisição e Resposta da API
        // ==============================================
        console.log('╔═══════════════════════════════════════════════════════════════════╗');
        console.log('║           🔍 SOLTOUR - DEBUG AVANÇADO - PÁGINA DE COTAÇÃO         ║');
        console.log('╚═══════════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('📦 DADOS COMPLETOS DO PACOTE:');
        console.log(JSON.stringify(packageData, null, 2));
        console.log('');
        console.log('🏨 BUDGET COMPLETO (availability response):');
        console.log(JSON.stringify(budget, null, 2));
        console.log('');
        console.log('🛏️ QUARTOS SELECIONADOS:');
        console.log('  → Número de quartos pesquisados:', numRoomsSearched);
        console.log('  → Quartos selecionados:', selectedRooms);
        console.log('  → Total de quartos no array:', selectedRooms.length);
        console.log('');

        // Debug de transfers
        const transferData = extractTransferData(budget);
        console.log('🚗 TRANSFERS DETECTADOS:');
        console.log('  → Tem transfers?', transferData.hasTransfers);
        if (transferData.hasTransfers) {
            console.log('  → Serviços de transfer:', JSON.stringify(transferData.transferServices, null, 2));
        }
        console.log('');

        // Debug de cancelamento
        const cancellationData = extractCancellationData(budget);
        console.log('❌ GASTOS DE CANCELAMENTO:');
        console.log('  → Total de períodos:', cancellationData.charges.length);
        console.log('  → Dados completos:', JSON.stringify(cancellationData.charges, null, 2));
        console.log('');

        // Debug de seguros (da resposta quote)
        const insuranceData = extractInsuranceData(packageData);
        console.log('🛡️ SEGUROS DISPONÍVEIS (QUOTE):');
        console.log('  → Tem seguros?', insuranceData.hasInsurances);
        if (insuranceData.hasInsurances) {
            console.log('  → Total de seguros:', insuranceData.insurances.length);
            console.log('  → Seguros:', JSON.stringify(insuranceData.insurances, null, 2));
        }
        console.log('');

        // Debug de extras (da resposta quote)
        const extrasData = extractExtrasData(packageData);
        console.log('🎁 SERVIÇOS EXTRAS (QUOTE):');
        console.log('  → Tem extras?', extrasData.hasExtras);
        if (extrasData.hasExtras) {
            console.log('  → Total de extras:', extrasData.extras.length);
            console.log('  → Extras:', JSON.stringify(extrasData.extras, null, 2));
        }
        console.log('');

        // Debug de textos legais (da resposta quote)
        const legalData = extractLegalData(packageData);
        console.log('📋 INFORMAÇÕES LEGAIS (QUOTE):');
        console.log('  → Tem informações legais?', legalData.hasLegalInfo);
        if (legalData.hasLegalInfo) {
            console.log('  → Total de textos:', legalData.legalTexts.length);
            console.log('  → Textos legais:', JSON.stringify(legalData.legalTexts, null, 2));
        }
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('');

        // USAR APENAS DADOS DO AVAILABILITY (budget)
        // NÃO usar details.hotelDetails que vem de chamada separada

        // Extrair dados do hotel do BUDGET e HOTELINFO
        const hotelCode = hotelService?.hotelCode || '';

        // IMPORTANTE: Usar dados do hotelInfo (availability) e não do hotelService
        let hotelName = 'Hotel';
        let hotelImage = '';
        let hotelLocation = '';
        let hotelStars = 0;
        let hotelDescription = '';

        if (packageData.hotelInfo) {
            // Usar dados do hotelsFromAvailability que foram salvos
            hotelName = packageData.hotelInfo.name || hotelService?.hotelName || 'Hotel';
            hotelImage = packageData.hotelInfo.mainImage || '';
            hotelLocation = packageData.hotelInfo.destinationDescription || '';
            const categoryCode = packageData.hotelInfo.categoryCode || '';
            hotelStars = (categoryCode.match(/\*/g) || []).length;
            hotelDescription = packageData.hotelInfo.description || packageData.hotelInfo.shortDescription || '';
        } else {
            // Fallback para hotelService se hotelInfo não estiver disponível
            hotelName = hotelService?.hotelName || 'Hotel';
        }

        // Preço
        const price = extractPrice(budget);

        // Passageiros - USAR DADOS CORRETOS DE searchParams (suportar múltiplos quartos)
        let allPassengers = [];
        let adults = 0;
        let children = 0;
        let passengerCount = 0;

        if (packageData.searchParams && packageData.searchParams.rooms) {
            try {
                const rooms = typeof packageData.searchParams.rooms === 'string'
                    ? JSON.parse(packageData.searchParams.rooms)
                    : packageData.searchParams.rooms;

                console.log('[SOLTOUR DEBUG] Página de cotação carregada');
                console.log('[SOLTOUR DEBUG] Dados dos quartos:', JSON.stringify(rooms, null, 2));

                // Coletar todos os passageiros de todos os quartos
                rooms.forEach(room => {
                    if (room.passengers) {
                        room.passengers.forEach(p => {
                            allPassengers.push(p);
                            if (p.type === 'ADULT') adults++;
                            else if (p.type === 'CHILD') children++;
                        });
                    }
                });

                passengerCount = allPassengers.length;
                console.log('[SOLTOUR DEBUG] Total de passageiros:', passengerCount, '(Adultos:', adults, ', Crianças:', children, ')');
            } catch (e) {
                console.error('Erro ao parsear rooms:', e);
            }
        }

        const pricePerPerson = passengerCount > 0 ? price / passengerCount : 0;

        // Noites
        const numNights = getNumNights(budget);

        // Voos - Usar flightData (outboundSegments/returnSegments) se disponível
        const flightData = packageData.flightData || null;

        // Meal plan
        const mealPlan = getMealPlan(budget);

        // Datas
        const { startDate, endDate } = getDates(budget);

        // HTML da página
        const html = `
            <div class="bt-quote-header">
                <h1>💼 Cotação do Seu Pacote</h1>
                <p>Preencha os dados abaixo para receber sua cotação personalizada</p>
            </div>

            <!-- Card Informativo sobre Guardar Orçamento -->
            <div class="bt-info-notice">
                <div class="bt-info-notice-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </div>
                <div class="bt-info-notice-content">
                    <p>Se desejar que guardemos o orçamento que acabou de criar, basta preencher os dados na secção "Dados dos Passageiros" e clicar em "Gerar Cotação final". Depois de guardado, entraremos em contacto consigo para formalizar a compra. Enviaremos uma cópia do orçamento para o endereço de e-mail que nos forneceu.</p>
                </div>
            </div>

            <div class="bt-quote-grid">
                <!-- Resumo do Pacote -->
                <div class="bt-package-summary">
                    <h2>📦 Resumo do Pacote</h2>

                    <!-- Container para Hotel e Voos lado a lado -->
                    <div class="bt-cards-row">
                        <!-- Hotel - Card Bonito -->
                        <div class="bt-summary-section">
                            <div class="bt-hotel-card">
                                <div class="bt-hotel-card-content">
                                    <h3 class="bt-card-section-title">🏨 Hotel selecionado</h3>
                                    <h4 class="bt-hotel-card-title">
                                        ${hotelName}
                                    </h4>
                                    ${hotelLocation ? `
                                        <p class="bt-hotel-card-location">
                                            <span class="bt-location-icon">📍</span>
                                            ${hotelLocation}
                                        </p>
                                    ` : ''}
                                    ${hotelStars > 0 ? `
                                    <div class="bt-hotel-card-footer">
                                        <div class="bt-hotel-stars-badge">
                                            ${'⭐'.repeat(hotelStars)}
                                        </div>
                                    </div>
                                    ` : ''}

                                    <!-- Acomodação - Todos os Quartos -->
                                    <div class="bt-room-info">
                                        <div class="bt-room-label">🛏️ Acomodação${numRoomsSearched > 1 ? 's' : ''} (${numRoomsSearched} quarto${numRoomsSearched > 1 ? 's' : ''})</div>
                                        ${selectedRooms.map((room, index) => {
                                            const adultsInRoom = room.passengers ? room.passengers.filter(p => p.type === 'ADULT').length : 0;
                                            const childrenInRoom = room.passengers ? room.passengers.filter(p => p.type === 'CHILD').length : 0;
                                            const totalInRoom = room.passengers ? room.passengers.length : 0;

                                            return `
                                                <div class="bt-room-item" style="margin-top: ${index > 0 ? '12px' : '0'}; padding-top: ${index > 0 ? '12px' : '0'}; border-top: ${index > 0 ? '1px solid #e5e7eb' : 'none'};">
                                                    ${numRoomsSearched > 1 ? `<div class="bt-room-number" style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">Quarto ${index + 1}</div>` : ''}
                                                    <div class="bt-room-name">${room.description || 'Quarto Duplo'}</div>
                                                    <div class="bt-room-occupancy" style="margin-top: 4px; color: #6b7280; font-size: 14px;">
                                                        👥 ${totalInRoom} passageiro${totalInRoom !== 1 ? 's' : ''} (${adultsInRoom} adulto${adultsInRoom !== 1 ? 's' : ''}${childrenInRoom > 0 ? `, ${childrenInRoom} criança${childrenInRoom !== 1 ? 's' : ''}` : ''})
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Voos - Cards Compactos -->
                        ${flightData ? `
                            <div class="bt-summary-section">
                                <div class="bt-flights-card">
                                    ${renderFlightsCompact(flightData)}
                                </div>
                            </div>
                        ` : ''}
                    </div>

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

                    <!-- Card de Transfers (se disponível) -->
                    ${renderTransferCard(transferData)}

                    <!-- Card de Gastos de Cancelamento -->
                    ${renderCancellationCard(cancellationData)}

                    <!-- Card de Seguros (da resposta quote) -->
                    ${renderInsuranceCard(insuranceData)}

                    <!-- Card de Extras (da resposta quote) -->
                    ${renderExtrasCard(extrasData)}

                    <!-- Card de Informações Legais (da resposta quote) -->
                    ${renderLegalTextsCard(legalData)}
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
                ${renderPassengerForms(allPassengers)}
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

        // Expandir cards por padrão
        $('.bt-transfer-card, .bt-cancellation-card, .bt-insurance-card, .bt-extras-card, .bt-legal-card').addClass('expanded');

        // Bind eventos
        bindQuoteEvents();

        // Esconder loading modal apenas DEPOIS de renderizar tudo
        // O modal foi aberto em soltour-booking.js quando clicou em "Selecionar"
        if (typeof hideLoadingModal === 'function') {
            hideLoadingModal();
        } else if (window.hideLoadingModal) {
            window.hideLoadingModal();
        } else {
            // Fallback: tentar esconder modal diretamente
            const modal = $('#soltour-loading-modal');
            if (modal.length) {
                modal.removeClass('active');
            }
        }

    }

    /**
     * Renderizar voos de forma compacta (usando estrutura do availability: outboundSegments/returnSegments)
     */
    function renderFlightsCompact(flightData) {
        if (!flightData) return '';

        // Helper para formatar horário do formato HH:mm:ss
        function formatTimeSimple(timeStr) {
            if (!timeStr) return '';
            try {
                // Se for formato HH:mm:ss, pegar só HH:mm
                if (timeStr.includes(':')) {
                    const parts = timeStr.split(':');
                    return parts[0] + ':' + parts[1];
                }
                // Fallback para Date
                const date = new Date(timeStr);
                return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                return timeStr;
            }
        }

        // Helper para formatar data no formato "23 nov"
        function formatDateSimple(dateStr) {
            if (!dateStr) return '';
            try {
                const date = new Date(dateStr);
                const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
                return date.getDate() + ' ' + months[date.getMonth()];
            } catch (e) {
                return dateStr;
            }
        }

        // Mapeamento de códigos IATA para nomes de companhias
        const airlineNames = {
            '2W': 'World2Fly',
            'TP': 'TAP Air Portugal',
            'IB': 'Iberia',
            'UX': 'Air Europa',
            'VY': 'Vueling',
            'FR': 'Ryanair',
            'U2': 'easyJet',
            'LH': 'Lufthansa',
            'BA': 'British Airways',
            'AF': 'Air France',
            'KL': 'KLM'
        };

        function getAirlineName(code) {
            return airlineNames[code] || code;
        }

        let html = '<h3 class="bt-card-section-title">✈️ Voo selecionado</h3>';

        // ESTRUTURA REAL DO SOLTOUR API: outboundSegments[] e returnSegments[]
        const outboundSegments = flightData.outboundSegments || [];
        const returnSegments = flightData.returnSegments || [];

        // Renderizar IDA (OUTBOUND)
        if (outboundSegments.length > 0) {
            const firstSeg = outboundSegments[0];
            const lastSeg = outboundSegments[outboundSegments.length - 1];
            const airlineName = getAirlineName(firstSeg.operatingCompanyCode);
            const stopInfo = outboundSegments.length > 1 ? `${outboundSegments.length - 1} escala${outboundSegments.length > 2 ? 's' : ''}` : 'Direto';

            html += `
                <div class="flight-card-compact">
                    <div class="flight-compact-header">
                        <span class="flight-type-label">🛫 Ida</span>
                        <span class="flight-compact-date">${formatDateSimple(firstSeg.departureDate)}</span>
                    </div>
                    <div class="flight-compact-body">
                        <div class="flight-compact-route">
                            <div class="flight-compact-point">
                                <div class="flight-compact-time">${formatTimeSimple(firstSeg.departureTime)}</div>
                                <div class="flight-compact-airport">${firstSeg.originAirport}</div>
                            </div>
                            <div class="flight-compact-arrow">
                                <div class="arrow">→</div>
                                <div class="flight-compact-stops">${stopInfo}</div>
                            </div>
                            <div class="flight-compact-point">
                                <div class="flight-compact-time">${formatTimeSimple(lastSeg.arrivalTime)}</div>
                                <div class="flight-compact-airport">${lastSeg.destinationAirport}</div>
                            </div>
                        </div>
                        <div class="flight-compact-details">
                            <span class="flight-compact-airline">${airlineName}</span>
                            <span class="flight-compact-number">Voo ${firstSeg.flightNumber || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Renderizar VOLTA (RETURN)
        if (returnSegments.length > 0) {
            const firstSeg = returnSegments[0];
            const lastSeg = returnSegments[returnSegments.length - 1];
            const airlineName = getAirlineName(firstSeg.operatingCompanyCode);
            const stopInfo = returnSegments.length > 1 ? `${returnSegments.length - 1} escala${returnSegments.length > 2 ? 's' : ''}` : 'Direto';

            html += `
                <div class="flight-card-compact">
                    <div class="flight-compact-header">
                        <span class="flight-type-label">🛬 Volta</span>
                        <span class="flight-compact-date">${formatDateSimple(firstSeg.departureDate)}</span>
                    </div>
                    <div class="flight-compact-body">
                        <div class="flight-compact-route">
                            <div class="flight-compact-point">
                                <div class="flight-compact-time">${formatTimeSimple(firstSeg.departureTime)}</div>
                                <div class="flight-compact-airport">${firstSeg.originAirport}</div>
                            </div>
                            <div class="flight-compact-arrow">
                                <div class="arrow">→</div>
                                <div class="flight-compact-stops">${stopInfo}</div>
                            </div>
                            <div class="flight-compact-point">
                                <div class="flight-compact-time">${formatTimeSimple(lastSeg.arrivalTime)}</div>
                                <div class="flight-compact-airport">${lastSeg.destinationAirport}</div>
                            </div>
                        </div>
                        <div class="flight-compact-details">
                            <span class="flight-compact-airline">${airlineName}</span>
                            <span class="flight-compact-number">Voo ${firstSeg.flightNumber || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Se não houver segmentos, mostrar mensagem genérica
        if (outboundSegments.length === 0 && returnSegments.length === 0) {
            html += `
                <div class="flight-card-compact">
                    <div class="flight-compact-body" style="text-align: center; padding: 20px;">
                        Informações de voo disponíveis na confirmação
                    </div>
                </div>
            `;
        }

        return html;
    }

    /**
     * Renderizar resumo de voos - Cards Bonitos
     */
    function renderFlightsSummary(flights) {
        let html = '<div class="bt-flights-container">';

        const outbound = flights.find(f => f.type === 'OUTBOUND');
        const inbound = flights.find(f => f.type === 'INBOUND');

        // VOO DE IDA
        if (outbound) {
            const segments = outbound.flightSegments || [];
            const firstSegment = segments[0] || {};
            const lastSegment = segments[segments.length - 1] || {};

            const airline = firstSegment.operatingAirline || firstSegment.marketingAirline || 'Companhia Aérea';
            const flightNumber = firstSegment.marketingFlightNumber || firstSegment.operatingFlightNumber || '';
            const originCode = firstSegment.originAirportCode || '';
            const destinationCode = lastSegment.destinationAirportCode || '';
            const originCity = firstSegment.originCity || originCode;
            const destinationCity = lastSegment.destinationCity || destinationCode;

            const departureDateTime = firstSegment.departureDate || '';
            const arrivalDateTime = lastSegment.arrivalDate || '';
            const departureTime = formatTime(departureDateTime);
            const arrivalTime = formatTime(arrivalDateTime);
            const departureDate = formatDate(departureDateTime);

            const numStops = segments.length - 1;
            const duration = calculateFlightDuration(departureDateTime, arrivalDateTime);

            html += `
                <div class="bt-flight-card bt-flight-outbound">
                    <div class="bt-flight-card-header">
                        <div class="bt-flight-type">
                            <span class="bt-flight-icon">🛫</span>
                            <span class="bt-flight-label">Voo de Ida</span>
                        </div>
                        <div class="bt-flight-date">${departureDate}</div>
                    </div>
                    <div class="bt-flight-card-body">
                        <div class="bt-flight-route-visual">
                            <div class="bt-flight-point bt-flight-origin">
                                <div class="bt-airport-code">${originCode}</div>
                                <div class="bt-city-name">${originCity}</div>
                                <div class="bt-time">${departureTime}</div>
                            </div>
                            <div class="bt-flight-path">
                                <div class="bt-flight-line">
                                    <div class="bt-plane-icon">✈️</div>
                                </div>
                                <div class="bt-flight-info">
                                    ${duration ? `<div class="bt-duration">${duration}</div>` : ''}
                                    ${numStops > 0 ? `<div class="bt-stops">${numStops} ${numStops === 1 ? 'escala' : 'escalas'}</div>` : '<div class="bt-stops bt-direct">Direto</div>'}
                                </div>
                            </div>
                            <div class="bt-flight-point bt-flight-destination">
                                <div class="bt-airport-code">${destinationCode}</div>
                                <div class="bt-city-name">${destinationCity}</div>
                                <div class="bt-time">${arrivalTime}</div>
                            </div>
                        </div>
                        <div class="bt-flight-card-footer">
                            <div class="bt-airline-info">
                                <span class="bt-airline-name">${airline}</span>
                                ${flightNumber ? `<span class="bt-flight-number">#${flightNumber}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // VOO DE VOLTA
        if (inbound) {
            const segments = inbound.flightSegments || [];
            const firstSegment = segments[0] || {};
            const lastSegment = segments[segments.length - 1] || {};

            const airline = firstSegment.operatingAirline || firstSegment.marketingAirline || 'Companhia Aérea';
            const flightNumber = firstSegment.marketingFlightNumber || firstSegment.operatingFlightNumber || '';
            const originCode = firstSegment.originAirportCode || '';
            const destinationCode = lastSegment.destinationAirportCode || '';
            const originCity = firstSegment.originCity || originCode;
            const destinationCity = lastSegment.destinationCity || destinationCode;

            const departureDateTime = firstSegment.departureDate || '';
            const arrivalDateTime = lastSegment.arrivalDate || '';
            const departureTime = formatTime(departureDateTime);
            const arrivalTime = formatTime(arrivalDateTime);
            const departureDate = formatDate(departureDateTime);

            const numStops = segments.length - 1;
            const duration = calculateFlightDuration(departureDateTime, arrivalDateTime);

            html += `
                <div class="bt-flight-card bt-flight-inbound">
                    <div class="bt-flight-card-header">
                        <div class="bt-flight-type">
                            <span class="bt-flight-icon">🛬</span>
                            <span class="bt-flight-label">Voo de Regresso</span>
                        </div>
                        <div class="bt-flight-date">${departureDate}</div>
                    </div>
                    <div class="bt-flight-card-body">
                        <div class="bt-flight-route-visual">
                            <div class="bt-flight-point bt-flight-origin">
                                <div class="bt-airport-code">${originCode}</div>
                                <div class="bt-city-name">${originCity}</div>
                                <div class="bt-time">${departureTime}</div>
                            </div>
                            <div class="bt-flight-path">
                                <div class="bt-flight-line">
                                    <div class="bt-plane-icon">✈️</div>
                                </div>
                                <div class="bt-flight-info">
                                    ${duration ? `<div class="bt-duration">${duration}</div>` : ''}
                                    ${numStops > 0 ? `<div class="bt-stops">${numStops} ${numStops === 1 ? 'escala' : 'escalas'}</div>` : '<div class="bt-stops bt-direct">Direto</div>'}
                                </div>
                            </div>
                            <div class="bt-flight-point bt-flight-destination">
                                <div class="bt-airport-code">${destinationCode}</div>
                                <div class="bt-city-name">${destinationCity}</div>
                                <div class="bt-time">${arrivalTime}</div>
                            </div>
                        </div>
                        <div class="bt-flight-card-footer">
                            <div class="bt-airline-info">
                                <span class="bt-airline-name">${airline}</span>
                                ${flightNumber ? `<span class="bt-flight-number">#${flightNumber}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
     * Calcular duração do voo
     */
    function calculateFlightDuration(departure, arrival) {
        if (!departure || !arrival) return null;

        try {
            const dep = new Date(departure);
            const arr = new Date(arrival);
            const diffMs = arr - dep;
            const diffMins = Math.floor(diffMs / 60000);
            const hours = Math.floor(diffMins / 60);
            const minutes = diffMins % 60;

            if (hours > 0) {
                return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
            }
            return `${minutes}m`;
        } catch (e) {
            return null;
        }
    }

    /**
     * Formatar data completa
     */
    function formatDate(dateStr) {
        if (!dateStr) return '';

        try {
            const date = new Date(dateStr);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (e) {
            return dateStr;
        }
    }

    /**
     * Renderizar formulários de passageiros
     */
    function renderPassengerForms(allPassengers) {
        let html = '';
        let adultCount = 0;
        let childCount = 0;

        allPassengers.forEach((passenger, index) => {
            if (passenger.type === 'ADULT') {
                adultCount++;
                const i = adultCount;
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
            } else if (passenger.type === 'CHILD') {
                childCount++;
                const i = childCount;
                const age = passenger.age || 10;
                html += `
                    <div class="bt-form-section">
                        <h3>👶 Criança ${i} <span class="bt-passenger-badge">Menor (${age} anos)</span></h3>
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
        });

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

        // Event listener para checkboxes de transfer
        $('.bt-transfer-checkbox').off('change').on('change', function() {
            updateTotalPrice();
        });

        // Event listener para checkboxes de seguros
        $('.bt-insurance-checkbox').off('change').on('change', function() {
            updateTotalPrice();
        });

        // Event listener para checkboxes de extras
        $('.bt-extra-checkbox').off('change').on('change', function() {
            updateTotalPrice();
        });

        // Event listener para links "Mais informações"
        $('.bt-transfer-link').off('click').on('click', function(e) {
            e.preventDefault();
            const $service = $(this).closest('.bt-transfer-service');
            const $details = $service.find('.bt-transfer-service-details');

            // Toggle detalhes
            $details.slideToggle(300);

            // Mudar texto do link
            const isVisible = $details.is(':visible');
            $(this).text(isVisible ? 'Menos informações' : 'Mais informações');
        });
    }

    /**
     * Atualizar preço total com transfers, seguros e extras selecionados
     */
    function updateTotalPrice() {
        // Obter preço base do packageData
        const packageData = BeautyTravelQuote.packageData;
        const budget = packageData.budget || {};
        let basePrice = extractPrice(budget);

        console.log('[SOLTOUR] 💰 Recalculando preço total...');
        console.log('[SOLTOUR] Preço base:', basePrice.toFixed(2) + '€');

        // Somar preços dos transfers marcados (excluindo os já incluídos)
        let transfersTotal = 0;
        $('.bt-transfer-checkbox:checked').each(function() {
            const isIncluded = $(this).data('included') === true || $(this).data('included') === 'true';

            // Só adicionar ao total se NÃO estiver incluído
            if (!isIncluded) {
                const transferPrice = parseFloat($(this).data('transfer-price')) || 0;
                transfersTotal += transferPrice;
                console.log('[SOLTOUR] + Transfer (adicional):', transferPrice.toFixed(2) + '€');
            } else {
                console.log('[SOLTOUR] • Transfer incluído (já no preço base)');
            }
        });

        // Somar preços dos seguros marcados (excluindo os já incluídos)
        let insurancesTotal = 0;
        $('.bt-insurance-checkbox:checked').each(function() {
            const isIncluded = $(this).data('included') === true || $(this).data('included') === 'true';

            // Só adicionar ao total se NÃO estiver incluído
            if (!isIncluded) {
                const insurancePrice = parseFloat($(this).data('insurance-price')) || 0;
                insurancesTotal += insurancePrice;
                console.log('[SOLTOUR] + Seguro (adicional):', insurancePrice.toFixed(2) + '€');
            } else {
                console.log('[SOLTOUR] • Seguro incluído (já no preço base)');
            }
        });

        // Somar preços dos extras marcados (excluindo os já incluídos)
        let extrasTotal = 0;
        $('.bt-extra-checkbox:checked').each(function() {
            const isIncluded = $(this).data('included') === true || $(this).data('included') === 'true';

            // Só adicionar ao total se NÃO estiver incluído
            if (!isIncluded) {
                const extraPrice = parseFloat($(this).data('extra-price')) || 0;
                extrasTotal += extraPrice;
                console.log('[SOLTOUR] + Extra (adicional):', extraPrice.toFixed(2) + '€');
            } else {
                console.log('[SOLTOUR] • Extra incluído (já no preço base)');
            }
        });

        // Calcular novo total
        const newTotal = basePrice + transfersTotal + insurancesTotal + extrasTotal;

        console.log('[SOLTOUR] = Total final:', newTotal.toFixed(2) + '€');
        console.log('');

        // Atualizar display do preço
        $('.bt-price-total-amount').text(newTotal.toFixed(0) + '€');

        // Atualizar também no objeto global
        if (BeautyTravelQuote.packageData) {
            BeautyTravelQuote.packageData.calculatedTotal = newTotal;
        }
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

        // Log de debug para verificar dados enviados
        console.log('[SOLTOUR DEBUG] Gerando cotação com os seguintes dados:');
        console.log('[SOLTOUR DEBUG] Budget Data:', BeautyTravelQuote.budgetData);
        console.log('[SOLTOUR DEBUG] Passengers:', formData.passengers);
        console.log('[SOLTOUR DEBUG] Rooms (searchParams):', BeautyTravelQuote.budgetData?.searchParams?.rooms);

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

    // ===========================
    // FUNÇÕES DE EXTRAÇÃO DE DADOS
    // ===========================

    /**
     * Extrai dados de transfers do budget
     * Conforme documentação: budget.transferServices[]
     */
    function extractTransferData(budget) {
        const transferServices = budget.transferServices || [];
        const hasTransfers = transferServices.length > 0;

        return {
            hasTransfers: hasTransfers,
            transferServices: transferServices
        };
    }

    /**
     * Extrai dados de cancelamento de todos os serviços
     * Conforme documentação:
     * - hotelServices[].cancellationChargeServices[]
     * - flightServices[].cancellationChargeServices[]
     * - transferServices[].cancellationChargeServices[]
     * - insuranceServices[].cancellationChargeServices[]
     */
    function extractCancellationData(budget) {
        const charges = [];

        // Grupos de serviços
        const serviceGroups = [
            { type: 'HOTEL', services: budget.hotelServices || [] },
            { type: 'FLIGHT', services: budget.flightServices || [] },
            { type: 'TRANSFER', services: budget.transferServices || [] },
            { type: 'INSURANCE', services: budget.insuranceServices || [] }
        ];

        // Iterar por todos os grupos
        serviceGroups.forEach(group => {
            group.services.forEach(service => {
                const cancellationServices = service.cancellationChargeServices || [];

                cancellationServices.forEach(cancellation => {
                    charges.push({
                        serviceType: cancellation.serviceType || group.type,
                        startDate: cancellation.startDate || null,
                        endDate: cancellation.endDate || null,
                        amount: cancellation.priceInfo?.pvp || 0,
                        currency: cancellation.priceInfo?.currency || 'EUR'
                    });
                });
            });
        });

        // Ordenar por data de início
        charges.sort((a, b) => {
            if (!a.startDate || !b.startDate) return 0;
            return new Date(a.startDate) - new Date(b.startDate);
        });

        return {
            charges: charges
        };
    }

    /**
     * Extrai dados de seguros da resposta quote
     * Conforme documentação: quoteData.insurances[]
     */
    function extractInsuranceData(packageData) {
        // Verificar se temos quoteData
        const quoteData = packageData.quoteData || packageData.quote;
        if (!quoteData) {
            return { hasInsurances: false, insurances: [] };
        }

        const insurances = quoteData.insurances || [];
        const hasInsurances = insurances.length > 0;

        return {
            hasInsurances: hasInsurances,
            insurances: insurances
        };
    }

    /**
     * Extrai dados de extras da resposta quote
     * Conforme documentação: quoteData.extras[]
     */
    function extractExtrasData(packageData) {
        // Verificar se temos quoteData
        const quoteData = packageData.quoteData || packageData.quote;
        if (!quoteData) {
            return { hasExtras: false, extras: [] };
        }

        const extras = quoteData.extras || [];
        const hasExtras = extras.length > 0;

        return {
            hasExtras: hasExtras,
            extras: extras
        };
    }

    /**
     * Extrai textos legais e condições da resposta quote
     * Conforme documentação: quoteData.importantInformation[]
     */
    function extractLegalData(packageData) {
        // Verificar se temos quoteData
        const quoteData = packageData.quoteData || packageData.quote;
        if (!quoteData) {
            return { hasLegalInfo: false, legalTexts: [] };
        }

        const legalTexts = quoteData.importantInformation || [];
        const hasLegalInfo = legalTexts.length > 0;

        return {
            hasLegalInfo: hasLegalInfo,
            legalTexts: legalTexts
        };
    }

    /**
     * Renderiza card de Transfers
     */
    function renderTransferCard(transferData) {
        if (!transferData.hasTransfers) {
            return ''; // Não mostrar card se não houver transfers
        }

        // Filtrar apenas transfers que têm informação válida (com ou sem preço)
        const validTransfers = transferData.transferServices.filter(transfer => {
            // Transfer é válido se tiver título/descrição OU preço definido
            const hasDescription = transfer.title || transfer.description;
            const hasPrice = transfer.priceInfo?.pvp !== undefined || transfer.price?.pvp !== undefined;
            return hasDescription || hasPrice;
        });

        // Se não houver transfers válidos, não mostrar card
        if (validTransfers.length === 0) {
            return '';
        }

        let html = `
            <div class="bt-summary-section bt-transfer-card">
                <div class="bt-transfer-header">
                    <h3>🚗 TRANSFER PRIVADO</h3>
                    <button class="bt-transfer-toggle" onclick="this.closest('.bt-transfer-card').classList.toggle('expanded')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="bt-transfer-body">
                    <p class="bt-transfer-description">Ofereça ao seu cliente um serviço directo ao hotel num carro privado.</p>
                    <div class="bt-transfer-services">
        `;

        // Renderizar cada serviço de transfer válido
        validTransfers.forEach((transfer, index) => {
            const title = transfer.title || transfer.description || 'Transfer privado';
            const serviceId = transfer.serviceId || `transfer-${index}`;

            // Extrair preço do transfer
            const transferPrice = transfer.priceInfo?.pvp || transfer.price?.pvp || 0;
            const currency = transfer.priceInfo?.currency || transfer.price?.currency || 'EUR';
            const currencySymbol = currency === 'EUR' ? '€' : currency;

            // Verificar se transfer já está incluído no preço
            // Transfer incluído = preço 0 OU propriedade included = true OU status = "INCLUDED"
            const isIncluded = transferPrice === 0 ||
                              transfer.included === true ||
                              transfer.status === 'INCLUDED' ||
                              transfer.priceInfo?.included === true;

            // Se incluído, vem pré-selecionado e bloqueado
            const checkedAttr = isIncluded ? 'checked' : '';
            const disabledAttr = isIncluded ? 'disabled' : '';
            const includedClass = isIncluded ? 'bt-transfer-included' : '';
            const includedLabel = isIncluded ? '<span class="bt-included-badge">Incluído</span>' : '';

            html += `
                <div class="bt-transfer-service ${includedClass}" data-transfer-id="${serviceId}" data-transfer-price="${transferPrice}" data-included="${isIncluded}">
                    <div class="bt-transfer-service-checkbox">
                        <input type="checkbox"
                               id="transfer-checkbox-${index}"
                               class="bt-transfer-checkbox"
                               data-transfer-price="${transferPrice}"
                               data-transfer-id="${serviceId}"
                               data-included="${isIncluded}"
                               ${checkedAttr}
                               ${disabledAttr}>
                        <label for="transfer-checkbox-${index}"></label>
                    </div>
                    <div class="bt-transfer-service-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 17h14v-5H5v5z"/>
                            <path d="M3 13h18M5 17l-2 2M19 17l2 2"/>
                        </svg>
                    </div>
                    <div class="bt-transfer-service-content">
                        <div class="bt-transfer-service-title">
                            ${title}
                            ${includedLabel}
                        </div>
                        <div class="bt-transfer-service-details" style="display: none;">
                            <strong>Preço:</strong> ${isIncluded ? 'Incluído no pacote' : transferPrice.toFixed(2) + currencySymbol}
                        </div>
                    </div>
                    <div class="bt-transfer-service-actions">
                        <a href="#" class="bt-transfer-link" data-transfer-index="${index}">Mais informações</a>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Renderiza card de Gastos de Cancelamento
     */
    function renderCancellationCard(cancellationData) {
        if (cancellationData.charges.length === 0) {
            return ''; // Não mostrar card se não houver gastos de cancelamento
        }

        let html = `
            <div class="bt-summary-section bt-cancellation-card">
                <div class="bt-cancellation-header">
                    <h3>❌ CUSTOS DE CANCELAMENTO</h3>
                    <button class="bt-cancellation-toggle" onclick="this.closest('.bt-cancellation-card').classList.toggle('expanded')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="bt-cancellation-body">
                    <p class="bt-cancellation-description">Detalhamos os custos que serão aplicados por data de cancelamento</p>
                    <div class="bt-cancellation-table-wrapper">
                        <table class="bt-cancellation-table">
                            <thead>
                                <tr>
                                    <th>De</th>
                                    <th>Até</th>
                                    <th class="bt-text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        // Renderizar cada período de cancelamento
        cancellationData.charges.forEach(charge => {
            const startDate = charge.startDate ? formatDateSimple(charge.startDate) : 'N/A';
            const endDate = charge.endDate ? formatDateSimple(charge.endDate) : 'N/A';
            const amount = charge.amount.toFixed(2);
            const currency = charge.currency === 'EUR' ? '€' : charge.currency;

            html += `
                <tr>
                    <td>${startDate}</td>
                    <td>${endDate}</td>
                    <td class="bt-text-right bt-amount">${amount}${currency}</td>
                </tr>
            `;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Formatar data no formato dd/mm/yyyy
     */
    function formatDateSimple(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (e) {
            return dateStr;
        }
    }

    /**
     * Renderiza card de Seguros
     */
    function renderInsuranceCard(insuranceData) {
        if (!insuranceData.hasInsurances) {
            return ''; // Não mostrar card se não houver seguros
        }

        const insurances = insuranceData.insurances;

        let html = `
            <div class="bt-summary-section bt-insurance-card">
                <div class="bt-insurance-header">
                    <h3>🛡️ SEGUROS DISPONÍVEIS</h3>
                    <button class="bt-insurance-toggle" onclick="this.closest('.bt-insurance-card').classList.toggle('expanded')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="bt-insurance-body">
                    <p class="bt-insurance-description">Proteja a sua viagem com um seguro de viagem completo.</p>
                    <div class="bt-insurance-services">
        `;

        // Renderizar cada seguro disponível
        insurances.forEach((insurance, index) => {
            const name = insurance.name || insurance.title || 'Seguro de Viagem';
            const description = insurance.description || 'Cobertura completa para a sua viagem';
            const price = insurance.priceInfo?.pvp || insurance.price?.pvp || 0;
            const currency = insurance.priceInfo?.currency || insurance.price?.currency || 'EUR';
            const currencySymbol = currency === 'EUR' ? '€' : currency;
            const insuranceId = insurance.insuranceId || insurance.serviceId || `insurance-${index}`;

            // Verificar se já está incluído
            const isIncluded = price === 0 || insurance.included === true || insurance.status === 'INCLUDED';
            const checkedAttr = isIncluded ? 'checked' : '';
            const disabledAttr = isIncluded ? 'disabled' : '';
            const includedClass = isIncluded ? 'bt-insurance-included' : '';
            const includedLabel = isIncluded ? '<span class="bt-included-badge">Incluído</span>' : '';

            html += `
                <div class="bt-insurance-service ${includedClass}" data-insurance-id="${insuranceId}" data-insurance-price="${price}" data-included="${isIncluded}">
                    <div class="bt-insurance-service-checkbox">
                        <input type="checkbox"
                               id="insurance-checkbox-${index}"
                               class="bt-insurance-checkbox"
                               data-insurance-price="${price}"
                               data-insurance-id="${insuranceId}"
                               data-included="${isIncluded}"
                               ${checkedAttr}
                               ${disabledAttr}>
                        <label for="insurance-checkbox-${index}"></label>
                    </div>
                    <div class="bt-insurance-service-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <div class="bt-insurance-service-content">
                        <div class="bt-insurance-service-title">
                            ${name}
                            ${includedLabel}
                        </div>
                        <div class="bt-insurance-service-description">
                            ${description}
                        </div>
                        <div class="bt-insurance-service-price">
                            <strong>${isIncluded ? 'Incluído no pacote' : price.toFixed(2) + currencySymbol}</strong>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Renderiza card de Extras
     */
    function renderExtrasCard(extrasData) {
        if (!extrasData.hasExtras) {
            return ''; // Não mostrar card se não houver extras
        }

        const extras = extrasData.extras;

        let html = `
            <div class="bt-summary-section bt-extras-card">
                <div class="bt-extras-header">
                    <h3>🎁 SERVIÇOS EXTRAS</h3>
                    <button class="bt-extras-toggle" onclick="this.closest('.bt-extras-card').classList.toggle('expanded')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="bt-extras-body">
                    <p class="bt-extras-description">Personalize a sua viagem com serviços adicionais.</p>
                    <div class="bt-extras-services">
        `;

        // Renderizar cada extra disponível
        extras.forEach((extra, index) => {
            const name = extra.name || extra.title || extra.description || 'Serviço Extra';
            const description = extra.description || extra.shortDescription || '';
            const price = extra.priceInfo?.pvp || extra.price?.pvp || 0;
            const currency = extra.priceInfo?.currency || extra.price?.currency || 'EUR';
            const currencySymbol = currency === 'EUR' ? '€' : currency;
            const extraId = extra.extraId || extra.serviceId || `extra-${index}`;

            // Verificar se já está incluído
            const isIncluded = price === 0 || extra.included === true || extra.status === 'INCLUDED';
            const checkedAttr = isIncluded ? 'checked' : '';
            const disabledAttr = isIncluded ? 'disabled' : '';
            const includedClass = isIncluded ? 'bt-extra-included' : '';
            const includedLabel = isIncluded ? '<span class="bt-included-badge">Incluído</span>' : '';

            html += `
                <div class="bt-extra-service ${includedClass}" data-extra-id="${extraId}" data-extra-price="${price}" data-included="${isIncluded}">
                    <div class="bt-extra-service-checkbox">
                        <input type="checkbox"
                               id="extra-checkbox-${index}"
                               class="bt-extra-checkbox"
                               data-extra-price="${price}"
                               data-extra-id="${extraId}"
                               data-included="${isIncluded}"
                               ${checkedAttr}
                               ${disabledAttr}>
                        <label for="extra-checkbox-${index}"></label>
                    </div>
                    <div class="bt-extra-service-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                    </div>
                    <div class="bt-extra-service-content">
                        <div class="bt-extra-service-title">
                            ${name}
                            ${includedLabel}
                        </div>
                        ${description ? `<div class="bt-extra-service-description">${description}</div>` : ''}
                        <div class="bt-extra-service-price">
                            <strong>${isIncluded ? 'Incluído no pacote' : price.toFixed(2) + currencySymbol}</strong>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Renderiza card de Textos Legais e Condições
     */
    function renderLegalTextsCard(legalData) {
        if (!legalData.hasLegalInfo) {
            return ''; // Não mostrar card se não houver informações legais
        }

        // Filtrar valores null, undefined ou vazios do array
        const legalTexts = legalData.legalTexts.filter(item => {
            if (item === null || item === undefined) return false;

            // Se for string, verificar se não está vazia
            if (typeof item === 'string') {
                return item.trim().length > 0;
            }

            // Se for objeto, aceitar
            return true;
        });

        // Se após filtrar não houver textos válidos, não mostrar o card
        if (legalTexts.length === 0) {
            return '';
        }

        let html = `
            <div class="bt-summary-section bt-legal-card">
                <div class="bt-legal-header">
                    <h3>📋 INFORMAÇÕES IMPORTANTES E CONDIÇÕES</h3>
                    <button class="bt-legal-toggle" onclick="this.closest('.bt-legal-card').classList.toggle('expanded')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="bt-legal-body">
                    <div class="bt-legal-accordion">
        `;

        // Renderizar cada texto legal como item do accordion
        legalTexts.forEach((legalText, index) => {
            // Se for string, converter para objeto
            let title, content, type;

            if (typeof legalText === 'string') {
                // É uma string simples - tentar extrair um título inteligente
                const trimmedText = legalText.trim();
                const firstLine = trimmedText.split('\n')[0].trim();

                // Detectar padrões comuns para criar títulos melhores
                if (firstLine.toUpperCase().includes('AIR EUROPA')) {
                    title = 'AIR EUROPA - Informações de voo';
                } else if (firstLine.toUpperCase().includes('IMPORTANTE')) {
                    title = 'Informações importantes';
                } else if (trimmedText.includes('taxa turistica') || trimmedText.includes('taxa turística')) {
                    title = 'Taxa turística';
                } else if (trimmedText.includes('bagagem') || trimmedText.includes('Bagagem')) {
                    title = 'Política de bagagem';
                } else if (trimmedText.includes('E-ticket') || trimmedText.includes('e-ticket')) {
                    title = 'E-ticket - República Dominicana';
                } else if (trimmedText.includes('crianças') || trimmedText.includes('Crianças')) {
                    title = 'Política de crianças e acomodação';
                } else if (trimmedText.includes('check-in')) {
                    title = 'Informações de check-in';
                } else if (trimmedText.toUpperCase().includes('NO SHOW')) {
                    title = 'Política de NO SHOW';
                } else if (trimmedText.includes('OBSERVAÇÕES')) {
                    title = 'Observações gerais';
                } else {
                    // Usar as primeiras palavras como título
                    const words = firstLine.split(' ').slice(0, 10).join(' ');
                    title = words.length < firstLine.length ? words + '...' : words;
                }

                content = legalText;
                type = 'general';
            } else {
                // É um objeto - extrair propriedades
                title = legalText.title || legalText.name || `Informação ${index + 1}`;
                content = legalText.content || legalText.description || legalText.text || '';
                type = legalText.type || 'general';
            }

            // Ícone baseado no tipo
            let icon = '📄';
            if (type.toLowerCase().includes('cancel')) icon = '❌';
            else if (type.toLowerCase().includes('payment')) icon = '💳';
            else if (type.toLowerCase().includes('insurance')) icon = '🛡️';
            else if (type.toLowerCase().includes('policy')) icon = '📜';

            html += `
                <div class="bt-legal-item" data-legal-type="${type}">
                    <div class="bt-legal-item-header" onclick="this.closest('.bt-legal-item').classList.toggle('expanded')">
                        <span class="bt-legal-item-icon">${icon}</span>
                        <span class="bt-legal-item-title">${title}</span>
                        <svg class="bt-legal-item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                    <div class="bt-legal-item-content">
                        <div class="bt-legal-item-text">${content}</div>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        return html;
    }

})(jQuery);
