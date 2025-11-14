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

        // Debug: Verificar dados dos quartos
        console.log('[SOLTOUR DEBUG] Renderizando página de cotação');
        console.log('[SOLTOUR DEBUG] Número de quartos pesquisados:', numRoomsSearched);
        console.log('[SOLTOUR DEBUG] Quartos selecionados:', selectedRooms);
        console.log('[SOLTOUR DEBUG] Total de quartos no array:', selectedRooms.length);

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

})(jQuery);
