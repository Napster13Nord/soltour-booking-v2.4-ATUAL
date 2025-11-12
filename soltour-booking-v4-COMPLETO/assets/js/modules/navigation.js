/**
 * Módulo Navigation
 * Gerencia navegação entre páginas mantendo estado
 *
 * Funcionalidades:
 * - Go back mantendo availToken e filtros
 * - Uso de fromCache para evitar nova busca
 * - Preservação de estado da URL
 * - Histórico de navegação
 */

(function($) {
    'use strict';

    window.SoltourApp.Navigation = {
        /**
         * Inicializa navegação
         */
        init: function() {
            console.log('✅ Inicializando módulo Navigation...');

            this.bindEvents();
        },

        /**
         * Bind eventos de navegação
         */
        bindEvents: function() {
            const self = this;

            // Botão "Voltar" na página de quote
            $(document.body).on('click', '.js-go-back', function(e) {
                e.preventDefault();
                self.goBackToAvailability($(this));
            });

            // Botão "Voltar" genérico
            $(document.body).on('click', '.js-nav-back', function(e) {
                e.preventDefault();
                window.history.back();
            });
        },

        /**
         * Volta para availability mantendo estado
         */
        goBackToAvailability: function($button) {
            console.log('⬅️  Voltando para availability...');

            const data = $button.data();

            // Obter availToken e fromPage
            const availToken = data.availToken ||
                             data.avail_token ||
                             window.SoltourApp.availToken;

            const fromPage = data.fromPage || data.from_page || 'QUOTE';

            if (!availToken) {
                console.error('❌ availToken não encontrado');

                if (window.SoltourApp.Toast) {
                    window.SoltourApp.Toast.error(
                        'Erro ao voltar. Token de sessão não encontrado.',
                        4000
                    );
                }

                // Fallback: voltar usando history
                window.history.back();
                return;
            }

            console.log('  📋 availToken:', availToken);
            console.log('  📄 fromPage:', fromPage);

            // Preparar request de availability
            const rq = this.buildAvailabilityRequest(availToken, fromPage);

            console.log('  🔄 Request:', rq);

            // Mostrar loading
            showLoadingModal('Voltando...', 'Carregando disponibilidade');

            // Submeter formulário para voltar
            this.submitAvailabilityForm(rq);
        },

        /**
         * Constrói request de availability com cache
         */
        buildAvailabilityRequest: function(availToken, fromPage) {
            // Tentar obter dados da busca original
            const searchParams = window.SoltourApp.searchParams || {};
            const availRq = window.SoltourApp.availRq || {};

            // Combinar dados disponíveis
            const rq = {
                availToken: availToken,
                fromCache: true, // IMPORTANTE: usar cache
                fromPage: fromPage
            };

            // Adicionar parâmetros de busca se disponíveis
            if (searchParams.originCode) {
                rq.originCode = searchParams.originCode;
            }
            if (searchParams.destinationCode) {
                rq.destinationCode = searchParams.destinationCode;
            }
            if (searchParams.startDate) {
                rq.startDate = searchParams.startDate;
            }
            if (searchParams.numNights) {
                rq.numNights = searchParams.numNights;
            }
            if (searchParams.rooms) {
                rq.rooms = searchParams.rooms;
            }

            // Adicionar dados do availRq se disponíveis
            if (availRq.productType) {
                rq.productType = availRq.productType;
            }
            if (availRq.onlyHotel) {
                rq.onlyHotel = availRq.onlyHotel;
            }

            return rq;
        },

        /**
         * Submete formulário para ir para availability
         */
        submitAvailabilityForm: function(rq) {
            // Criar formulário temporário
            const $form = $('<form>', {
                method: 'POST',
                action: this.getAvailabilityUrl()
            });

            // Adicionar campos
            $.each(rq, function(key, value) {
                if (value !== null && value !== undefined) {
                    let fieldValue = value;

                    // Serializar objetos/arrays
                    if (typeof value === 'object') {
                        fieldValue = JSON.stringify(value);
                    }

                    $('<input>').attr({
                        type: 'hidden',
                        name: key,
                        value: fieldValue
                    }).appendTo($form);
                }
            });

            // Adicionar ao body e submeter
            $form.appendTo('body').submit();
        },

        /**
         * Retorna URL da página de availability
         */
        getAvailabilityUrl: function() {
            // Tentar obter da configuração
            if (window.soltourData && window.soltourData.availabilityUrl) {
                return window.soltourData.availabilityUrl;
            }

            // Fallback: usar caminho relativo
            return '/availability/';
        },

        /**
         * Salva estado atual na sessão
         */
        saveState: function(state) {
            if (typeof sessionStorage !== 'undefined') {
                try {
                    sessionStorage.setItem('soltour_nav_state', JSON.stringify(state));
                    console.log('✅ Estado salvo na sessão');
                } catch (e) {
                    console.error('❌ Erro ao salvar estado:', e);
                }
            }
        },

        /**
         * Restaura estado da sessão
         */
        restoreState: function() {
            if (typeof sessionStorage !== 'undefined') {
                try {
                    const stateJson = sessionStorage.getItem('soltour_nav_state');
                    if (stateJson) {
                        const state = JSON.parse(stateJson);
                        console.log('✅ Estado restaurado:', state);
                        return state;
                    }
                } catch (e) {
                    console.error('❌ Erro ao restaurar estado:', e);
                }
            }
            return null;
        },

        /**
         * Limpa estado da sessão
         */
        clearState: function() {
            if (typeof sessionStorage !== 'undefined') {
                try {
                    sessionStorage.removeItem('soltour_nav_state');
                    console.log('✅ Estado limpo');
                } catch (e) {
                    console.error('❌ Erro ao limpar estado:', e);
                }
            }
        }
    };

    // Inicializar quando documento estiver pronto
    $(document).ready(function() {
        if (typeof window.SoltourApp !== 'undefined') {
            window.SoltourApp.Navigation.init();
        }
    });

})(jQuery);
