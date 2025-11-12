/**
 * Módulo Breakdown
 * Gerencia o desglose de preços (breakdown) dinâmico
 *
 * Funcionalidades:
 * - Alternar entre visão bruta (gross) e líquida (net)
 * - Cálculo dinâmico de totais
 * - Mostrar/ocultar colunas
 * - Suporte a múltiplas moedas
 * - Desglose completo vs simplificado
 */

(function($) {
    'use strict';

    window.SoltourApp.Breakdown = {
        currentView: 'gross', // 'gross' ou 'net'
        showDetailed: false,

        /**
         * Inicializa o módulo de breakdown
         */
        init: function() {
            console.log('✅ Inicializando módulo Breakdown...');

            this.bindEvents();
            this.setBreakdownView('gross'); // Começar em visão bruta
        },

        /**
         * Bind eventos
         */
        bindEvents: function() {
            const self = this;

            // Toggle desglose completo/simplificado
            $(document.body).on('change', '[id=breakdownView_complete]', function() {
                self.toggleBreakdowns();
            });

            // Alternar entre bruto/líquido
            $(document.body).on('change', '[name=breakdownView]', function() {
                const view = $(this).val();
                self.setBreakdownView(view);
            });

            // Botão de imprimir cotação
            $(document.body).on('click', '.js-print-quote', function(e) {
                e.preventDefault();
                self.printQuote();
            });

            // Botão de enviar por email
            $(document.body).on('click', '.js-send-mail', function(e) {
                e.preventDefault();
                // Abrir modal de email (magnificPopup se disponível)
                if ($.magnificPopup) {
                    $.magnificPopup.open({
                        items: {
                            src: '#sendEmailModal',
                            type: 'inline'
                        },
                        midClick: true
                    });
                } else {
                    // Fallback: mostrar modal simples
                    $('#sendEmailModal').show();
                }
            });

            // Submit do formulário de email
            $('form#sendEmailForm').on('submit', function(e) {
                e.preventDefault();
                self.submitEmailForm(this);
            });
        },

        /**
         * Alterna entre desglose completo e simplificado
         */
        toggleBreakdowns: function() {
            console.log('🔄 Alternando desglose...');

            $('.js-breakdown-row').each(function() {
                const $this = $(this);
                const detailed = $this.data('detailed');

                if (detailed !== undefined) {
                    if (detailed) {
                        // Ocultar linha detalhada
                        $this.addClass('u-display-none');
                        $this.data('detailed', false);
                    } else {
                        // Mostrar linha detalhada
                        $this.removeClass('u-display-none');
                        $this.data('detailed', true);
                    }
                }
            });

            this.showDetailed = !this.showDetailed;
            console.log('  ✓ Desglose detalhado:', this.showDetailed ? 'SIM' : 'NÃO');
        },

        /**
         * Define a visão do breakdown (bruto ou líquido)
         * @param {string} view - 'gross' ou 'net'
         */
        setBreakdownView: function(view) {
            console.log('🔄 Mudando visão do breakdown para:', view);

            const $netColumns = $('.js-net-column');
            this.currentView = view;

            if (view === 'gross') {
                // Visão bruta - ocultar colunas líquidas
                $netColumns.hide();
                console.log('  ✓ Colunas líquidas ocultadas');
            } else if (view === 'net') {
                // Visão líquida - mostrar colunas líquidas
                $netColumns.show();
                console.log('  ✓ Colunas líquidas exibidas');
            }

            // Recalcular totais
            this.calculateBreakdownTotals();

            // Salvar preferência globalmente
            if (window.SoltourApp) {
                window.SoltourApp.breakdownView = view;
            }
        },

        /**
         * Calcula totais do breakdown baseado nas colunas visíveis
         */
        calculateBreakdownTotals: function() {
            console.log('🔢 Calculando totais do breakdown...');

            let totalCalculated = 0;

            $('.js-breakdown-total').each(function() {
                const column = $(this).data('column');
                if (!column) return;

                let total = 0;

                // Somar valores de todas as linhas visíveis dessa coluna
                $('.js-breakdown-row:not(.u-display-none) ' +
                  '.js-breakdown-column[data-column="' + column + '"]').each(function() {
                    const value = parseFloat($(this).data('value')) || 0;
                    total += value;

                    // Adicionar equipagem se presente
                    const $luggageTotal = $(this).find('[data-luggage-total]');
                    if ($luggageTotal.length) {
                        const luggageValue = parseFloat($luggageTotal.data('luggageTotal')) || 0;
                        total += luggageValue;
                    }
                });

                // Formatar e exibir
                const currency = $(this).data('currency') || 'EUR';
                const formattedTotal = formatCurrency(total, currency);

                $(this).html(formattedTotal);

                // Guardar para comparação
                if (column === 'gross' || column === 'total') {
                    totalCalculated = total;
                }
            });

            console.log('  ✓ Total calculado:', totalCalculated);

            /**
             * Formata valor como moeda
             */
            function formatCurrency(value, currency) {
                const locale = getLocale(currency);

                if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
                    return new Intl.NumberFormat(locale, {
                        style: 'currency',
                        currency: currency
                    }).format(value);
                } else {
                    // Fallback simples
                    return value.toFixed(2) + ' ' + getCurrencySymbol(currency);
                }
            }

            /**
             * Retorna locale baseado na moeda
             */
            function getLocale(currency) {
                switch (currency) {
                    case 'USD':
                        return 'en-US';
                    case 'GBP':
                        return 'en-GB';
                    case 'EUR':
                    default:
                        return 'pt-PT';
                }
            }

            /**
             * Retorna símbolo da moeda
             */
            function getCurrencySymbol(currency) {
                switch (currency) {
                    case 'USD': return '$';
                    case 'GBP': return '£';
                    case 'EUR': return '€';
                    default: return currency;
                }
            }
        },

        /**
         * Imprime a cotação
         */
        printQuote: function() {
            console.log('🖨️  Imprimindo cotação...');

            const $form = $('form#bookForm');
            if ($form.length === 0) {
                console.error('❌ Formulário de booking não encontrado');
                return;
            }

            // Serializar formulário
            const formData = this.serializeForm($form);

            // Adicionar visão do breakdown
            formData.breakdownView = this.currentView;

            console.log('Dados para impressão:', formData);

            showLoadingModal('Gerando PDF...', 'Preparando sua cotação');

            // Enviar para API
            $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: {
                    action: 'soltour_print_quote',
                    nonce: soltourData.nonce,
                    quote_data: JSON.stringify(formData)
                },
                timeout: 30000,
                success: function(response) {
                    hideLoadingModal();

                    if (response.success && response.data && response.data.pdf_url) {
                        console.log('✅ PDF gerado:', response.data.pdf_url);

                        // Abrir PDF em nova aba
                        window.open(response.data.pdf_url, '_blank');

                        if (window.SoltourApp.Toast) {
                            window.SoltourApp.Toast.success('PDF gerado com sucesso!', 3000);
                        }
                    } else {
                        console.error('❌ Erro ao gerar PDF:', response);

                        const message = response.data && response.data.message
                            ? response.data.message
                            : 'Erro ao gerar PDF. Tente novamente.';

                        if (window.SoltourApp.Toast) {
                            window.SoltourApp.Toast.error(message, 5000);
                        } else {
                            alert(message);
                        }
                    }
                },
                error: function(xhr, status, error) {
                    hideLoadingModal();
                    console.error('❌ Erro ao imprimir:', error);

                    if (window.SoltourApp.Toast) {
                        window.SoltourApp.Toast.error(
                            'Erro ao gerar PDF. Tente novamente.',
                            5000
                        );
                    } else {
                        alert('Erro ao gerar PDF');
                    }
                }
            });
        },

        /**
         * Envia cotação por email
         */
        submitEmailForm: function(form) {
            console.log('📧 Enviando cotação por email...');

            const $form = $(form);
            const $bookForm = $('form#bookForm');

            // Validar email
            const email = $form.find('input[type="email"]').val();
            if (!email || !this.validateEmail(email)) {
                if (window.SoltourApp.Toast) {
                    window.SoltourApp.Toast.error('Email inválido', 3000);
                } else {
                    alert('Email inválido');
                }
                return;
            }

            // Serializar ambos os formulários
            const emailData = this.serializeForm($form);
            const bookingData = this.serializeForm($bookForm);

            // Combinar dados
            const combinedData = $.extend({}, bookingData, emailData);
            combinedData.breakdownView = this.currentView;

            console.log('Dados para envio:', combinedData);

            showLoadingModal('Enviando email...', 'Aguarde um momento');

            // Enviar para API
            $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: {
                    action: 'soltour_send_quote_email',
                    nonce: soltourData.nonce,
                    email_data: JSON.stringify(combinedData)
                },
                timeout: 30000,
                success: function(response) {
                    hideLoadingModal();

                    if (response.success) {
                        console.log('✅ Email enviado com sucesso');

                        // Fechar modal
                        if ($.magnificPopup) {
                            $.magnificPopup.close();
                        } else {
                            $('#sendEmailModal').hide();
                        }

                        // Limpar formulário
                        $form[0].reset();

                        if (window.SoltourApp.Toast) {
                            window.SoltourApp.Toast.success(
                                'Email enviado com sucesso!',
                                4000
                            );
                        } else {
                            alert('Email enviado com sucesso!');
                        }
                    } else {
                        console.error('❌ Erro ao enviar email:', response);

                        const message = response.data && response.data.message
                            ? response.data.message
                            : 'Erro ao enviar email. Tente novamente.';

                        if (window.SoltourApp.Toast) {
                            window.SoltourApp.Toast.error(message, 5000);
                        } else {
                            alert(message);
                        }
                    }
                },
                error: function(xhr, status, error) {
                    hideLoadingModal();
                    console.error('❌ Erro ao enviar email:', error);

                    if (window.SoltourApp.Toast) {
                        window.SoltourApp.Toast.error(
                            'Erro ao enviar email. Tente novamente.',
                            5000
                        );
                    } else {
                        alert('Erro ao enviar email');
                    }
                }
            });
        },

        /**
         * Valida formato de email
         */
        validateEmail: function(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        /**
         * Serializa formulário
         */
        serializeForm: function($form) {
            if (typeof $form.serializeJSON === 'function') {
                return $form.serializeJSON({
                    useIntKeysAsArrayIndex: true,
                    parseNumbers: true,
                    skipFalsyValuesForTypes: ["string"]
                });
            } else {
                // Fallback básico
                const formData = {};
                const formArray = $form.serializeArray();

                $.each(formArray, function(i, field) {
                    formData[field.name] = field.value;
                });

                return formData;
            }
        }
    };

    // Inicializar quando documento estiver pronto
    $(document).ready(function() {
        if (typeof window.SoltourApp !== 'undefined') {
            window.SoltourApp.Breakdown.init();
        }
    });

})(jQuery);
