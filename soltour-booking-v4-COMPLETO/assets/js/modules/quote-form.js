/**
 * Módulo Quote Form
 * Gerencia o formulário de cotação e reserva
 *
 * Inclui:
 * - Validação CheckAllowedSelling antes do submit
 * - Validações de formulário
 * - Submit de booking
 * - Copy holder to first passenger
 */

(function($) {
    'use strict';

    window.SoltourApp.QuoteForm = {
        $form: null,
        checkedPassengersName: false,

        /**
         * Inicializa o formulário de quote/booking
         */
        init: function() {
            this.$form = $('form#bookForm');

            if (this.$form.length === 0) {
                console.log('⚠️  Formulário de booking não encontrado');
                return;
            }

            console.log('✅ Inicializando formulário de booking...');

            this.bindEvents();
            this.initCopyHolder();
        },

        /**
         * Bind eventos do formulário
         */
        bindEvents: function() {
            const self = this;

            // Botão de submit com validação CheckAllowedSelling
            $('.js-submit-form').on('click', function(e) {
                e.preventDefault();
                self.handleSubmitClick();
            });

            // Submit real do formulário
            this.$form.on('submit', function(e) {
                e.preventDefault();
                self.submitBookingForm();
            });

            // Prevenir duplo clique no submit
            $(document).on('invalid', function(e) {
                $('.js-submit-form').prop('disabled', false);
            }, true);
        },

        /**
         * Handler do clique no botão de submit
         * Valida com CheckAllowedSelling ANTES de permitir submit
         */
        handleSubmitClick: function() {
            const self = this;

            console.log('🔒 Validando venda antes de submeter...');

            // Desabilitar botão para evitar duplo clique
            $('.js-submit-form').prop('disabled', true);

            // Mostrar loading
            showLoadingModal('Validando...', 'Verificando disponibilidade para reserva');

            // Chamar CheckAllowedSelling
            $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: {
                    action: 'soltour_check_allowed_selling',
                    nonce: soltourData.nonce
                },
                success: function(response) {
                    hideLoadingModal();

                    if (response.success && response.data && response.data.allowed) {
                        // Venda permitida - triggerar submit real do formulário
                        console.log('✅ CheckAllowedSelling: Venda permitida');

                        // Triggerar submit do formulário (HTML5 validation)
                        self.$form.find('input[type=submit]').trigger('click');
                    } else {
                        // Venda não permitida - mostrar erro
                        console.error('❌ CheckAllowedSelling: Venda bloqueada');

                        const message = response.data && response.data.message
                            ? response.data.message
                            : 'Desculpe, não é possível realizar a reserva no momento. ' +
                              'Por favor, tente novamente ou entre em contato conosco.';

                        if (window.SoltourApp.Toast) {
                            window.SoltourApp.Toast.error(message, 6000);
                        } else {
                            alert(message);
                        }

                        $('.js-submit-form').prop('disabled', false);
                    }
                },
                error: function(xhr, status, error) {
                    hideLoadingModal();
                    console.error('❌ Erro ao validar venda:', error);

                    // Fail-safe: permitir continuar em caso de erro de rede
                    console.warn('⚠️  Erro na validação, permitindo continuar (fail-safe)');

                    self.$form.find('input[type=submit]').trigger('click');
                }
            });
        },

        /**
         * Submit do formulário de reserva
         */
        submitBookingForm: function() {
            const self = this;

            console.log('=== SUBMIT BOOKING FORM ===');

            // Serializar dados do formulário
            const formData = this.serializeBookingForm();

            console.log('Dados do formulário:', formData);

            // Mostrar loading
            showLoadingModal('Processando reserva...', 'Aguarde enquanto confirmamos sua reserva');

            // Enviar para API
            $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: {
                    action: 'soltour_book_package',
                    nonce: soltourData.nonce,
                    booking_data: JSON.stringify(formData)
                },
                timeout: 60000, // 60 segundos
                success: function(response) {
                    hideLoadingModal();

                    if (response.success && response.data) {
                        console.log('✅ Reserva criada com sucesso:', response.data);

                        // Mostrar toast de sucesso
                        if (window.SoltourApp.Toast) {
                            window.SoltourApp.Toast.success(
                                'Reserva confirmada com sucesso!',
                                3000
                            );
                        }

                        // Redirecionar para página de confirmação
                        if (response.data.redirect_url) {
                            setTimeout(function() {
                                window.location.href = response.data.redirect_url;
                            }, 1000);
                        } else if (response.data.bookingReference) {
                            // Fallback: usar bookingReference
                            setTimeout(function() {
                                window.location.href = '/booking-confirmation/?ref=' +
                                    response.data.bookingReference;
                            }, 1000);
                        }
                    } else {
                        // Erro da API
                        console.error('❌ Erro ao criar reserva:', response);

                        const message = response.data && response.data.message
                            ? response.data.message
                            : 'Erro ao processar reserva. Por favor, tente novamente.';

                        if (window.SoltourApp.Toast) {
                            window.SoltourApp.Toast.error(message, 6000);
                        } else {
                            alert(message);
                        }

                        $('.js-submit-form').prop('disabled', false);
                    }
                },
                error: function(xhr, status, error) {
                    hideLoadingModal();
                    console.error('❌ Erro AJAX ao criar reserva:', error);
                    console.error('Status:', status);
                    console.error('XHR:', xhr);

                    let message = 'Erro de conexão. Por favor, tente novamente.';

                    if (status === 'timeout') {
                        message = 'A requisição demorou muito. Por favor, tente novamente.';
                    }

                    if (window.SoltourApp.Toast) {
                        window.SoltourApp.Toast.error(message, 6000);
                    } else {
                        alert(message);
                    }

                    $('.js-submit-form').prop('disabled', false);
                }
            });
        },

        /**
         * Serializa dados do formulário
         */
        serializeBookingForm: function() {
            // Usar serializeJSON se disponível, senão usar método básico
            if (typeof this.$form.serializeJSON === 'function') {
                return this.$form.serializeJSON({
                    useIntKeysAsArrayIndex: true,
                    parseNumbers: true,
                    skipFalsyValuesForTypes: ["string"]
                });
            } else {
                // Fallback: serialização básica
                return this.basicSerializeForm();
            }
        },

        /**
         * Serialização básica do formulário
         */
        basicSerializeForm: function() {
            const formData = {};
            const formArray = this.$form.serializeArray();

            $.each(formArray, function(i, field) {
                // Estruturar dados aninhados
                const name = field.name;
                const value = field.value;

                // Tratar arrays (rooms[0][passengers][0][name])
                if (name.includes('[')) {
                    const keys = name.replace(/\]/g, '').split('[');
                    let current = formData;

                    for (let i = 0; i < keys.length - 1; i++) {
                        const key = keys[i];
                        if (!current[key]) {
                            // Se próximo índice é número, criar array
                            current[key] = !isNaN(keys[i + 1]) ? [] : {};
                        }
                        current = current[key];
                    }

                    current[keys[keys.length - 1]] = value;
                } else {
                    formData[name] = value;
                }
            });

            return formData;
        },

        /**
         * Inicializa funcionalidade de copiar titular para primeiro passageiro
         */
        initCopyHolder: function() {
            $('.js-toggle-copy-holder').on('change', function() {
                const checked = $(this).is(':checked');
                toggleCopyHolder(checked);
            });

            function toggleCopyHolder(enabled) {
                const $toggleElements = $('.js-copy-to-first-passenger');

                if (enabled) {
                    // Habilitar cópia
                    $toggleElements.on('input', function() {
                        const name = $(this).data('name');
                        const value = $(this).val();
                        $('.js-copy-holder[data-name="' + name + '"]').val(value);
                    });

                    // Triggerar para copiar valores atuais
                    $toggleElements.trigger('input');

                    console.log('✅ Copy holder habilitado');
                } else {
                    // Desabilitar cópia
                    $toggleElements.off('input');
                    console.log('❌ Copy holder desabilitado');
                }
            }
        }
    };

    // Inicializar quando documento estiver pronto
    $(document).ready(function() {
        if (typeof window.SoltourApp !== 'undefined') {
            window.SoltourApp.QuoteForm.init();
        }
    });

})(jQuery);
