/**
 * Package Details Page JavaScript
 * Carrega e renderiza os detalhes completos de um pacote
 */

(function($) {
    'use strict';

    // Aguardar DOM ready
    $(document).ready(function() {
        // Verificar se estamos na página de detalhes
        if ($('#soltour-package-details').length === 0) {
            return;
        }

        console.log('🔍 Página de detalhes detectada, iniciando carregamento...');

        // Ler dados do sessionStorage
        const savedPackageStr = sessionStorage.getItem('soltour_selected_package');

        if (!savedPackageStr) {
            console.error('❌ Nenhum pacote selecionado encontrado no sessionStorage');
            showError('Pacote não encontrado. Por favor, volte e selecione um pacote novamente.');
            return;
        }

        let packageData;
        try {
            packageData = JSON.parse(savedPackageStr);
        } catch (e) {
            console.error('❌ Erro ao parsear dados do pacote:', e);
            showError('Erro ao carregar dados do pacote.');
            return;
        }

        console.log('📦 Pacote selecionado:', packageData);

        // Validar dados necessários
        if (!packageData.budgetId || !packageData.availToken) {
            console.error('❌ Dados incompletos:', packageData);
            showError('Dados do pacote incompletos.');
            return;
        }

        // Carregar detalhes do pacote
        loadPackageDetails(packageData);
    });

    /**
     * Carrega os detalhes do pacote via AJAX
     */
    function loadPackageDetails(packageData) {
        console.log('🔄 Carregando detalhes via AJAX...');

        $.ajax({
            url: soltourData.ajaxurl,
            type: 'POST',
            data: {
                action: 'soltour_get_package_details',
                nonce: soltourData.nonce,
                avail_token: packageData.availToken,
                budget_id: packageData.budgetId,
                hotel_code: packageData.hotelCode,
                provider_code: packageData.providerCode || 'UNDEFINED'
            },
            success: function(response) {
                console.log('✅ Response recebido:', response);

                if (response.success && response.data) {
                    renderPackageDetails(response.data, packageData);
                } else {
                    console.error('❌ Response sem success:', response);
                    showError(response.data && response.data.message ? response.data.message : 'Erro ao carregar detalhes do pacote.');
                }
            },
            error: function(xhr, status, error) {
                console.error('❌ Erro AJAX:', error);
                console.error('Status:', status);
                console.error('XHR:', xhr);
                showError('Erro de conexão ao carregar detalhes do pacote.');
            }
        });
    }

    /**
     * Renderiza os detalhes do pacote
     */
    function renderPackageDetails(data, packageData) {
        console.log('🎨 Renderizando detalhes...');

        const $container = $('#soltour-package-details');

        // Extrair informações
        const details = data.details || data.hotelDetails || {};
        const budget = data.budget || {};

        console.log('Details:', details);
        console.log('Budget:', budget);

        // Hotel info
        const hotelName = details.name || details.hotelName || 'Hotel';
        const hotelDescription = details.description || details.hotelDescription || '';
        const hotelAddress = details.address || '';
        const hotelImages = details.images || [];
        const hotelAmenities = details.amenities || details.facilities || [];

        // Preço
        let price = 0;
        if (budget.priceBreakdown &&
            budget.priceBreakdown.priceBreakdownDetails &&
            budget.priceBreakdown.priceBreakdownDetails[0] &&
            budget.priceBreakdown.priceBreakdownDetails[0].priceInfo) {
            price = budget.priceBreakdown.priceBreakdownDetails[0].priceInfo.pvp || 0;
        }

        // Voos
        const flightServices = budget.flightServices || [];

        // Transfers
        const transferServices = budget.transferServices || [];

        // Hotel services
        const hotelServices = budget.hotelServices || [];
        const hotelService = hotelServices[0] || {};

        // Datas
        const checkIn = hotelService.startDate || '';
        const checkOut = hotelService.endDate || '';

        // Montar HTML
        const html = `
            <div class="package-details-container">
                <!-- Header com imagem -->
                <div class="package-details-header">
                    ${hotelImages.length > 0 ? `
                        <img src="${hotelImages[0]}" alt="${hotelName}" class="package-header-image">
                    ` : ''}
                    <div class="package-header-overlay">
                        <h1 class="package-title">${hotelName}</h1>
                        ${hotelAddress ? `<p class="package-address"><i class="fas fa-map-marker-alt"></i> ${hotelAddress}</p>` : ''}
                    </div>
                </div>

                <!-- Conteúdo principal -->
                <div class="package-details-content">
                    <!-- Coluna esquerda -->
                    <div class="package-details-main">
                        <!-- Descrição do hotel -->
                        ${hotelDescription ? `
                            <section class="details-section">
                                <h2><i class="fas fa-info-circle"></i> Sobre o Hotel</h2>
                                <p>${hotelDescription}</p>
                            </section>
                        ` : ''}

                        <!-- Amenidades -->
                        ${hotelAmenities.length > 0 ? `
                            <section class="details-section">
                                <h2><i class="fas fa-star"></i> Comodidades</h2>
                                <ul class="amenities-list">
                                    ${hotelAmenities.slice(0, 10).map(amenity => `
                                        <li><i class="fas fa-check"></i> ${amenity}</li>
                                    `).join('')}
                                </ul>
                            </section>
                        ` : ''}

                        <!-- Voos -->
                        ${flightServices.length > 0 ? `
                            <section class="details-section">
                                <h2><i class="fas fa-plane"></i> Voos Incluídos</h2>
                                ${renderFlights(flightServices)}
                            </section>
                        ` : ''}

                        <!-- Transfers -->
                        ${transferServices.length > 0 ? `
                            <section class="details-section">
                                <h2><i class="fas fa-bus"></i> Transfers Incluídos</h2>
                                ${renderTransfers(transferServices)}
                            </section>
                        ` : ''}

                        <!-- Galeria de imagens -->
                        ${hotelImages.length > 1 ? `
                            <section class="details-section">
                                <h2><i class="fas fa-images"></i> Galeria</h2>
                                <div class="image-gallery">
                                    ${hotelImages.slice(1, 7).map(img => `
                                        <img src="${img}" alt="${hotelName}">
                                    `).join('')}
                                </div>
                            </section>
                        ` : ''}
                    </div>

                    <!-- Coluna direita (sidebar de reserva) -->
                    <div class="package-details-sidebar">
                        <div class="booking-card">
                            <div class="booking-price">
                                <span class="price-label">Preço Total</span>
                                <span class="price-value">${Math.round(price)}€</span>
                                <span class="price-note">para ${hotelService.pax || 2} pessoa(s)</span>
                            </div>

                            <div class="booking-dates">
                                <div class="date-item">
                                    <i class="fas fa-calendar-check"></i>
                                    <div>
                                        <strong>Check-in</strong>
                                        <span>${formatDate(checkIn)}</span>
                                    </div>
                                </div>
                                <div class="date-item">
                                    <i class="fas fa-calendar-times"></i>
                                    <div>
                                        <strong>Check-out</strong>
                                        <span>${formatDate(checkOut)}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="booking-info">
                                <div class="info-item">
                                    <i class="fas fa-moon"></i>
                                    <span>${hotelService.nights || 7} noites</span>
                                </div>
                                <div class="info-item">
                                    <i class="fas fa-utensils"></i>
                                    <span>${hotelService.boardName || 'Regime não especificado'}</span>
                                </div>
                                <div class="info-item">
                                    <i class="fas fa-bed"></i>
                                    <span>${hotelService.roomName || 'Quarto'}</span>
                                </div>
                            </div>

                            <button class="btn-reserve" onclick="proceedToBooking('${packageData.budgetId}', '${packageData.hotelCode}', '${packageData.providerCode || 'UNDEFINED'}')">
                                <i class="fas fa-shopping-cart"></i> Reservar Agora
                            </button>

                            <p class="booking-note">
                                <i class="fas fa-shield-alt"></i>
                                Reserva segura e protegida
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $container.html(html);
        console.log('✅ Detalhes renderizados com sucesso');
    }

    /**
     * Renderiza voos
     */
    function renderFlights(flightServices) {
        return flightServices.map(flight => {
            const segments = flight.segments || [];
            return `
                <div class="flight-info">
                    ${segments.map(segment => `
                        <div class="flight-segment">
                            <div class="flight-route">
                                <span class="airport">${segment.origin || ''}</span>
                                <i class="fas fa-arrow-right"></i>
                                <span class="airport">${segment.destination || ''}</span>
                            </div>
                            <div class="flight-details">
                                <span><i class="fas fa-clock"></i> ${segment.departureTime || ''} - ${segment.arrivalTime || ''}</span>
                                ${segment.airline ? `<span><i class="fas fa-plane"></i> ${segment.airline}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');
    }

    /**
     * Renderiza transfers
     */
    function renderTransfers(transferServices) {
        return transferServices.map(transfer => `
            <div class="transfer-info">
                <p><i class="fas fa-route"></i> ${transfer.type || 'Transfer'}</p>
                ${transfer.description ? `<p>${transfer.description}</p>` : ''}
            </div>
        `).join('');
    }

    /**
     * Formata data
     */
    function formatDate(dateStr) {
        if (!dateStr) return '-';

        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    /**
     * Mostra erro
     */
    function showError(message) {
        const $container = $('#soltour-package-details');
        $container.html(`
            <div class="package-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Erro ao Carregar Detalhes</h2>
                <p>${message}</p>
                <a href="/pacotes-resultados/" class="btn-back">
                    <i class="fas fa-arrow-left"></i> Voltar aos Resultados
                </a>
            </div>
        `);
    }

    // Função global para botão de reservar
    window.proceedToBooking = function(budgetId, hotelCode, providerCode) {
        console.log('🛒 Prosseguindo para reserva...');

        // Salvar no sessionStorage (se ainda não estiver)
        const availToken = JSON.parse(sessionStorage.getItem('soltour_selected_package')).availToken;

        sessionStorage.setItem('soltour_selected_package', JSON.stringify({
            budgetId: budgetId,
            hotelCode: hotelCode,
            providerCode: providerCode,
            availToken: availToken
        }));

        // Redirecionar para página de reserva
        window.location.href = '/reserva/';
    };

})(jQuery);
