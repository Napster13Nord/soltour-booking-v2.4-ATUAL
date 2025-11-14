/**
 * Página de Cotação - Layout Oficial Soltour
 * Carrega pacote selecionado e gera cotação conforme layout oficial
 */

(function($) {
    'use strict';

    // Namespace global
    window.BeautyTravelQuote = {
        packageData: null
    };

    // Aguardar DOM ready
    $(document).ready(function() {
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
        const selectedPackage = sessionStorage.getItem('soltour_selected_package');

        if (!selectedPackage) {
            renderError('Nenhum pacote selecionado', 'Por favor, volte à página de resultados e selecione um pacote.');
            return;
        }

        try {
            const packageData = JSON.parse(selectedPackage);

            console.log('=== DADOS DO PACOTE SELECIONADO ===');
            console.log('packageData completo:', packageData);

            if (!packageData.budget || !packageData.selectedRoom) {
                renderError('Dados incompletos', 'Os dados do pacote estão incompletos. Por favor, selecione novamente.');
                return;
            }

            BeautyTravelQuote.packageData = packageData;
            renderQuotePage();

        } catch (error) {
            console.error('Erro ao carregar pacote:', error);
            renderError('Erro ao carregar pacote', 'Os dados do pacote selecionado estão corrompidos.');
        }
    }

    /**
     * Renderizar página completa de cotação - LAYOUT OFICIAL SOLTOUR
     */
    function renderQuotePage() {
        const $container = $('#soltour-quote-page');
        const packageData = BeautyTravelQuote.packageData;
        const budget = packageData.budget || {};
        const selectedRoom = packageData.selectedRoom || {};
        const hotelService = budget.hotelServices && budget.hotelServices[0];
        const searchParams = packageData.searchParams || {};
        const hotelInfo = packageData.hotelInfo || {};

        // Extrair dados
        const price = extractPrice(budget);
        const numNights = getNumNights(budget);
        const mealPlan = getMealPlan(budget);
        const { startDate, endDate } = getDates(budget);
        const passengerCount = getPassengerCount(budget);
        const flightServices = budget.flightServices || [];

        // Dados do hotel
        const hotelName = hotelInfo.name || hotelService?.hotelName || 'Hotel';
        const hotelLocation = hotelInfo.destinationDescription || '';
        const categoryCode = hotelInfo.categoryCode || '';
        const hotelStars = (categoryCode.match(/\*/g) || []).length;

        // Dados de origem/destino
        const destinationName = hotelLocation || 'Destino';

        // HTML da página - LAYOUT OFICIAL SOLTOUR
        const html = `
            <!-- Título do Topo -->
            <div class="soltour-quote-top">
                <h1>Vacaciones a ${destinationName}</h1>
                <div class="top-info-row">
                    <span class="top-price-label">Confirmando precios y servicios</span>
                    <span class="top-price-value">Precio final €${price.toFixed(2)}</span>
                    <button type="button" class="btn-save-quote-top" id="btn-save-quote-top">
                        Guardar presupuesto
                    </button>
                </div>
            </div>

            <!-- Layout 2 Colunas -->
            <div class="soltour-quote-layout">
                <!-- Coluna Esquerda: Detalles del viaje -->
                <div class="soltour-left-column">
                    <div class="detalles-header">
                        <h2>Detalles del viaje</h2>
                        <div class="detalles-subtitle">
                            Desde ${searchParams.origin || 'Origen'} a ${destinationName} · Salida ${startDate} · ${numNights} noches · ${passengerCount} pasajeros
                        </div>
                    </div>

                    <!-- Seção: PASAJEROS -->
                    <div class="quote-section quote-section-open">
                        <div class="quote-section-header" onclick="toggleSection(this)">
                            <h3>PASAJEROS</h3>
                            <span class="toggle-icon">−</span>
                        </div>
                        <div class="quote-section-content">
                            <p class="section-description">Introduce los nombres y apellidos tal y como aparecen en el pasaporte o DNI.</p>
                            ${renderPassengerForms(passengerCount, budget)}
                        </div>
                    </div>

                    <!-- Seção: INFORMACIÓN IMPORTANTE -->
                    <div class="quote-section">
                        <div class="quote-section-header" onclick="toggleSection(this)">
                            <h3>INFORMACIÓN IMPORTANTE</h3>
                            <span class="toggle-icon">+</span>
                        </div>
                        <div class="quote-section-content" style="display: none;">
                            <p>Información importante sobre el viaje...</p>
                        </div>
                    </div>

                    <!-- Seção: TEXTOS LEGALES -->
                    <div class="quote-section">
                        <div class="quote-section-header" onclick="toggleSection(this)">
                            <h3>TEXTOS LEGALES</h3>
                            <span class="toggle-icon">+</span>
                        </div>
                        <div class="quote-section-content" style="display: none;">
                            <p>Textos legales...</p>
                        </div>
                    </div>

                <!-- Coluna Direita: PRECIO FINAL DEL VIAJE -->
                <div class="soltour-right-column">
                    <div class="precio-sidebar">
                        <h2 class="sidebar-title">PRECIO FINAL DEL VIAJE</h2>

                        <!-- VUELO SELECCIONADO -->
                        <div class="sidebar-section">
                            <h3 class="sidebar-section-title">VUELO SELECCIONADO</h3>
                            <div class="sidebar-section-content">
                                ${renderFlightsOfficial(flightServices)}
                            </div>
                        </div>

                        <!-- HOTEL SELECCIONADO -->
                        <div class="sidebar-section">
                            <h3 class="sidebar-section-title">HOTEL SELECCIONADO</h3>
                            <div class="sidebar-section-content">
                                <div class="hotel-name">${hotelName}</div>
                                <div class="hotel-category">Hotel ${hotelStars > 0 ? hotelStars + ' Estrellas' : ''}</div>

                                <div class="hotel-details-list">
                                    <div class="detail-row">
                                        <span class="detail-label">Fecha de entrada</span>
                                        <span class="detail-value">${startDate}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Número noches</span>
                                        <span class="detail-value">${numNights} noches</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Acomodación</span>
                                        <span class="detail-value">Habitación</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Tipo de habitación</span>
                                        <span class="detail-value">${selectedRoom.description || 'Habitación'}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Régimen</span>
                                        <span class="detail-value">${mealPlan}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Estado</span>
                                        <span class="detail-value detail-confirmed">Confirmado</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- PRECIO TOTAL -->
                        <div class="precio-total-box">
                            <span class="precio-total-label">PRECIO TOTAL</span>
                            <span class="precio-total-value">€${price.toFixed(2)}</span>
                        </div>

                        <!-- Botão Final -->
                        <button type="button" class="btn-save-quote-bottom" id="btn-save-quote-bottom">
                            Guardar presupuesto
                        </button>
                    </div>
                </div>
            </div>
        `;

        $container.html(html);

        // Esconder loading modal
        if (typeof hideLoadingModal === 'function') {
            hideLoadingModal();
        } else if (window.hideLoadingModal) {
            window.hideLoadingModal();
        } else {
            $('#soltour-loading-modal').removeClass('active');
        }
    }

    /**
     * Renderizar voos no formato oficial Soltour
     */
    function renderFlightsOfficial(flights) {
        if (!flights || flights.length === 0) {
            return '<p>Sem informações de voo</p>';
        }

        let html = '';

        // Tentar encontrar voos por tipo
        let outbound = flights.find(f => f.type === 'OUTBOUND');
        let inbound = flights.find(f => f.type === 'INBOUND');

        // Se não encontrou, assumir ordem: [0] = ida, [1] = volta
        if (!outbound && !inbound && flights.length > 0) {
            outbound = flights[0];
            inbound = flights[1] || null;
        }

        // Renderizar voo de ida
        if (outbound) {
            const segments = outbound.segments || outbound.flightSegments || [];
            if (segments.length > 0) {
                const firstSeg = segments[0];
                const lastSeg = segments[segments.length - 1];

                const originCode = firstSeg.origin || firstSeg.originAirportCode || '';
                const destCode = lastSeg.destination || lastSeg.destinationAirportCode || '';
                const originCity = firstSeg.originCity || originCode;
                const destCity = lastSeg.destinationCity || destCode;
                const depTime = firstSeg.departureTime || '';
                const arrTime = lastSeg.arrivalTime || '';
                const airline = firstSeg.carrierName || firstSeg.carrier || '';
                const flightNum = firstSeg.flightNumber || '';

                html += `
                    <div class="flight-row">
                        <div class="flight-route">
                            <span class="airport-code">${originCode}</span>
                            <span class="city-name">${originCity}</span>
                            <span class="flight-time">${depTime}</span>
                            <span class="route-arrow">→</span>
                            <span class="airport-code">${destCode}</span>
                            <span class="city-name">${destCity}</span>
                            <span class="flight-time">${arrTime}</span>
                        </div>
                        <div class="flight-info">
                            <span class="airline">${airline}</span>
                            <span class="flight-number">${flightNum}</span>
                            <span class="flight-status confirmed">Confirmado</span>
                        </div>
                    </div>
                `;
            }
        }

        // Renderizar voo de volta
        if (inbound) {
            const segments = inbound.segments || inbound.flightSegments || [];
            if (segments.length > 0) {
                const firstSeg = segments[0];
                const lastSeg = segments[segments.length - 1];

                const originCode = firstSeg.origin || firstSeg.originAirportCode || '';
                const destCode = lastSeg.destination || lastSeg.destinationAirportCode || '';
                const originCity = firstSeg.originCity || originCode;
                const destCity = lastSeg.destinationCity || destCode;
                const depTime = firstSeg.departureTime || '';
                const arrTime = lastSeg.arrivalTime || '';
                const airline = firstSeg.carrierName || firstSeg.carrier || '';
                const flightNum = firstSeg.flightNumber || '';

                html += `
                    <div class="flight-row">
                        <div class="flight-route">
                            <span class="airport-code">${originCode}</span>
                            <span class="city-name">${originCity}</span>
                            <span class="flight-time">${depTime}</span>
                            <span class="route-arrow">→</span>
                            <span class="airport-code">${destCode}</span>
                            <span class="city-name">${destCity}</span>
                            <span class="flight-time">${arrTime}</span>
                        </div>
                        <div class="flight-info">
                            <span class="airline">${airline}</span>
                            <span class="flight-number">${flightNum}</span>
                            <span class="flight-status confirmed">Confirmado</span>
                        </div>
                    </div>
                `;
            }
        }

        return html || '<p>Sem informações de voo</p>';
    }

    /**
     * Renderizar formulários de passageiros
     */
    function renderPassengerForms(count, budget) {
        let html = '';

        for (let i = 1; i <= count; i++) {
            html += `
                <div class="passenger-form">
                    <h4>Adulto ${i}</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nombre</label>
                            <input type="text" name="passenger_${i}_nombre" required>
                        </div>
                        <div class="form-group">
                            <label>Primer apellido</label>
                            <input type="text" name="passenger_${i}_primer_apellido" required>
                        </div>
                        <div class="form-group">
                            <label>Segundo apellido</label>
                            <input type="text" name="passenger_${i}_segundo_apellido">
                        </div>
                    </div>
                </div>
            `;
        }

        return html;
    }

    /**
     * Toggle seção expansível
     */
    window.toggleSection = function(header) {
        const section = $(header).closest('.quote-section');
        const content = section.find('.quote-section-content');
        const icon = section.find('.toggle-icon');

        if (content.is(':visible')) {
            content.slideUp();
            icon.text('+');
            section.removeClass('quote-section-open');
        } else {
            content.slideDown();
            icon.text('−');
            section.addClass('quote-section-open');
        }
    };

    /**
     * Funções auxiliares
     */
    function extractPrice(budget) {
        if (!budget.priceBreakdown || !budget.priceBreakdown.priceBreakdownDetails) {
            return 0;
        }
        const pvp = budget.priceBreakdown.priceBreakdownDetails[0]?.priceInfo?.pvp || 0;
        return parseFloat(pvp);
    }

    function getNumNights(budget) {
        if (!budget.hotelServices || !budget.hotelServices[0]) return 0;
        return budget.hotelServices[0].nights || 0;
    }

    function getMealPlan(budget) {
        if (!budget.hotelServices || !budget.hotelServices[0]) return 'N/A';
        const description = budget.hotelServices[0].mealPlan?.combination?.description || 'N/A';
        return description;
    }

    function getDates(budget) {
        let startDate = 'N/A';
        let endDate = 'N/A';

        if (budget.hotelServices && budget.hotelServices[0]) {
            const hotelService = budget.hotelServices[0];
            startDate = hotelService.startDate || 'N/A';
            endDate = hotelService.endDate || 'N/A';
        }

        return { startDate, endDate };
    }

    function getPassengerCount(budget) {
        if (!budget.hotelServices || !budget.hotelServices[0]) return 0;
        const rooms = budget.hotelServices[0].mealPlan?.combination?.rooms || [];
        let count = 0;
        rooms.forEach(room => {
            count += (room.passengers || []).length;
        });
        return count;
    }

    function renderError(title, message) {
        const html = `
            <div class="bt-error-container">
                <h2>${title}</h2>
                <p>${message}</p>
                <a href="/resultados" class="bt-btn-back">← Voltar aos Resultados</a>
            </div>
        `;
        $('#soltour-quote-page').html(html);
    }

})(jQuery);
