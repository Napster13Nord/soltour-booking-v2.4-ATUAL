/**
 * Módulo DelayedAvailability
 * Carregamento assíncrono de preços para melhorar performance
 *
 * Fluxo:
 * 1. Busca inicial rápida (forceAvail=false) - mostra hotéis sem preços
 * 2. Busca tardia (forceAvail=true) - atualiza preços em background
 */

(function($) {
    'use strict';

    window.SoltourApp.DelayedAvailability = {
        isActive: false,
        interval: null,
        budgetsPriceMap: {}, // Mapa budgetId -> price

        /**
         * Inicializa o delayed availability
         * @param {object} options - Configurações
         */
        init: function(options) {
            options = options || {};
            this.isActive = options.delayedAvailActive || false;

            if (this.isActive) {
                console.log('🔄 DelayedAvailability ATIVADO');
                this.startDelayedLoad();
            }
        },

        /**
         * Inicia o processo de carregamento tardio
         */
        startDelayedLoad: function() {
            console.log('%c[DelayedAvail] Iniciando carregamento tardio de preços', 'color: #ff9800; font-weight: bold');

            // 1. Mostrar skeleton nos preços
            this.showSkeletonPrices();

            // 2. Desabilitar interações
            this.disableInteractions();

            // 3. Mostrar notification piscando
            this.showBlinkingNotification();

            // 4. Fazer request com forceAvail=true
            this.loadDelayedPrices();
        },

        /**
         * Mostra skeleton shimmer nos preços
         */
        showSkeletonPrices: function() {
            $('.soltour-package-card .price-amount').each(function() {
                $(this).addClass('skeleton-shimmer');
                $(this).html('<div style="width: 80%; height: 32px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>');
            });

            // Adicionar CSS para animação shimmer se não existir
            if ($('#delayed-shimmer-style').length === 0) {
                $('head').append(`
                    <style id="delayed-shimmer-style">
                        @keyframes shimmer {
                            0% { background-position: -200% 0; }
                            100% { background-position: 200% 0; }
                        }
                        .skeleton-shimmer {
                            overflow: hidden;
                        }
                    </style>
                `);
            }

            console.log('💀 Skeleton prices mostrados');
        },

        /**
         * Desabilita interações durante o loading
         */
        disableInteractions: function() {
            // Desabilitar todos os botões "Ver Detalhes"
            $('.soltour-btn-primary').attr('disabled', true).css({
                'opacity': '0.6',
                'cursor': 'not-allowed'
            });

            // Desabilitar filtros
            $('#soltour-sort-by').attr('disabled', true);
            $('#soltour-max-price').attr('disabled', true);
            $('.soltour-star-filter input').attr('disabled', true);

            // Mudar cursor nos cards
            $('.soltour-package-card').css('cursor', 'wait');

            console.log('⏸️  Interações desabilitadas');
        },

        /**
         * Re-habilita interações após loading
         */
        enableInteractions: function() {
            // Re-habilitar botões
            $('.soltour-btn-primary').attr('disabled', false).css({
                'opacity': '1',
                'cursor': 'pointer'
            });

            // Re-habilitar filtros
            $('#soltour-sort-by').attr('disabled', false);
            $('#soltour-max-price').attr('disabled', false);
            $('.soltour-star-filter input').attr('disabled', false);

            // Restaurar cursor
            $('.soltour-package-card').css('cursor', '');

            console.log('▶️  Interações re-habilitadas');
        },

        /**
         * Mostra notification piscando
         */
        showBlinkingNotification: function() {
            const notification = `
                <div id="delayed-notification" style="
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 16px 32px;
                    border-radius: 50px;
                    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
                    z-index: 9999;
                    color: white;
                    font-weight: 600;
                    font-size: 15px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <div class="spinner" style="
                        width: 20px;
                        height: 20px;
                        border: 3px solid rgba(255,255,255,0.3);
                        border-top-color: white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    "></div>
                    <span>Atualizando preços em tempo real...</span>
                </div>
            `;

            // Adicionar CSS para spinner
            if ($('#delayed-spinner-style').length === 0) {
                $('head').append(`
                    <style id="delayed-spinner-style">
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    </style>
                `);
            }

            $('body').append(notification);

            // Efeito de pulse
            this.interval = setInterval(function() {
                $('#delayed-notification').animate({ opacity: 0.7 }, 800).animate({ opacity: 1 }, 800);
            }, 1600);

            console.log('📢 Notification piscando ativada');
        },

        /**
         * Esconde notification piscando
         */
        hideBlinkingNotification: function() {
            clearInterval(this.interval);
            $('#delayed-notification').fadeOut(400, function() {
                $(this).remove();
            });

            console.log('📢 Notification removida');
        },

        /**
         * Faz request com forceAvail=true para buscar preços reais
         */
        loadDelayedPrices: function() {
            const self = this;

            console.log('%c[DelayedAvail] Fazendo request com forceAvail=true', 'color: #ff9800; font-weight: bold');

            // Preparar params com forceAvail=true
            // IMPORTANTE: Buscar TODOS os budgets (100), não apenas os da página atual (10)
            const params = $.extend({}, window.SoltourApp.searchParams, {
                force_avail: true,
                avail_token: window.SoltourApp.availToken,
                item_count: 100  // Buscar TODOS os budgets para garantir que todos os preços sejam atualizados
            });

            console.log('[DelayedAvail] Params delayed:', params);
            console.log('[DelayedAvail] Buscando 100 budgets para atualizar todos os preços');

            $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: params,
                timeout: 30000, // 30 segundos timeout
                success: function(response) {
                    console.log('%c[DelayedAvail] ✅ Response recebido', 'color: #4caf50; font-weight: bold');
                    console.log('Response data:', response);

                    if (response.success && response.data) {
                        // Processar budgets e atualizar preços
                        self.processBudgetsAndUpdatePrices(response.data);

                        // Atualizar availToken se vier um novo
                        if (response.data.availToken) {
                            window.SoltourApp.availToken = response.data.availToken;

                            // Atualizar URL com novo token
                            if (typeof updateURLState === 'function') {
                                updateURLState(window.SoltourApp.availToken);
                            }
                        }

                        // Limpar UI
                        self.clearSkeletonPrices();
                        self.enableInteractions();
                        self.hideBlinkingNotification();

                        // Marcar hotéis sem preço
                        self.markUnavailableHotels();

                        console.log('%c[DelayedAvail] ✅ Processo concluído com sucesso!', 'color: #4caf50; font-weight: bold');

                    } else {
                        console.error('[DelayedAvail] Response sem success ou data');
                        self.showErrorAndCleanup();
                    }
                },
                error: function(xhr, status, error) {
                    console.error('[DelayedAvail] ❌ Erro AJAX:', error);
                    console.error('Status:', status);
                    console.error('XHR:', xhr);
                    self.showErrorAndCleanup();
                }
            });
        },

        /**
         * Processa budgets e atualiza preços nos cards
         */
        processBudgetsAndUpdatePrices: function(data) {
            console.log('[DelayedAvail] Processando budgets para atualizar preços...');

            if (!data.budgets || !Array.isArray(data.budgets)) {
                console.warn('[DelayedAvail] Sem budgets na response');
                return;
            }

            console.log(`[DelayedAvail] Total de budgets recebidos: ${data.budgets.length}`);

            let updatedCount = 0;
            let skippedNoPriceCount = 0;
            let skippedNoCardCount = 0;

            // Criar mapa budgetId -> price
            data.budgets.forEach(function(budget) {
                const budgetId = budget.budgetId;
                let price = 0;

                // Extrair preço
                if (budget.priceBreakdown &&
                    budget.priceBreakdown.priceBreakdownDetails &&
                    budget.priceBreakdown.priceBreakdownDetails[0] &&
                    budget.priceBreakdown.priceBreakdownDetails[0].priceInfo) {
                    price = budget.priceBreakdown.priceBreakdownDetails[0].priceInfo.pvp || 0;
                }

                if (price > 0) {
                    // Procurar card pelo budgetId e atualizar
                    const $card = $(`[data-budget-id="${budgetId}"]`);

                    if ($card.length > 0) {
                        const oldPrice = $card.find('.price-amount').text();
                        $card.find('.price-amount').html(Math.round(price) + '€');
                        updatedCount++;
                        console.log(`[DelayedAvail] Atualizado: ${budgetId} | ${oldPrice} → ${Math.round(price)}€`);
                    } else {
                        skippedNoCardCount++;
                        console.log(`[DelayedAvail] ⚠️  Card não encontrado para: ${budgetId}`);
                    }
                } else {
                    skippedNoPriceCount++;
                }
            });

            console.log(`[DelayedAvail] ✅ ${updatedCount} preços atualizados`);
            console.log(`[DelayedAvail] ⚠️  ${skippedNoPriceCount} budgets sem preço`);
            console.log(`[DelayedAvail] ⚠️  ${skippedNoCardCount} budgets sem card na página`);

            // Se nenhum preço foi atualizado, pode ser um problema
            if (updatedCount === 0 && data.budgets.length > 0) {
                console.error('[DelayedAvail] ❌ NENHUM PREÇO FOI ATUALIZADO! Possível problema de sincronização.');
            }
        },

        /**
         * Remove skeleton dos preços
         */
        clearSkeletonPrices: function() {
            $('.soltour-package-card .price-amount').removeClass('skeleton-shimmer');
            console.log('💀 Skeleton removido');
        },

        /**
         * Marca hotéis que não retornaram preço como indisponíveis
         */
        markUnavailableHotels: function() {
            let unavailableCount = 0;

            $('.soltour-package-card').each(function() {
                const $card = $(this);
                const priceText = $card.find('.price-amount').text().trim();

                // Se preço é 0 ou vazio, marcar como indisponível
                if (priceText === '' || priceText === '0€' || priceText.includes('shimmer')) {
                    $card.addClass('unavailable-hotel');
                    $card.css({
                        'opacity': '0.6',
                        'filter': 'grayscale(50%)'
                    });

                    // Atualizar botão
                    $card.find('.soltour-btn-primary')
                        .attr('disabled', true)
                        .text('Indisponível')
                        .css('background', '#ccc');

                    unavailableCount++;
                }
            });

            if (unavailableCount > 0) {
                console.log(`⚠️  ${unavailableCount} hotéis marcados como indisponíveis`);
            }
        },

        /**
         * Mostra erro e limpa UI
         */
        showErrorAndCleanup: function() {
            this.hideBlinkingNotification();
            this.clearSkeletonPrices();
            this.enableInteractions();

            // Mostrar mensagem de erro amigável
            alert('Não foi possível atualizar todos os preços. Por favor, tente recarregar a página.');

            console.error('[DelayedAvail] ❌ Processo falhou');
        }
    };

})(jQuery);
