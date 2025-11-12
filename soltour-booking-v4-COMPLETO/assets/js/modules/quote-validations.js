/**
 * Módulo Quote Validations
 * Validações avançadas do formulário de quote/booking
 *
 * Funcionalidades:
 * - Validação de idade vs data de nascimento
 * - Validação de email duplo (confirmação)
 * - Validação de expediente em tempo real (com debouncing)
 * - Validação de nomes duplicados
 */

(function($) {
    'use strict';

    window.SoltourApp.QuoteValidations = {
        DISPLAY_DATE_FORMAT: "DD/MM/YYYY",
        DATE_FORMAT: "YYYY-MM-DD",
        DEBOUNCE_TIME: 500,

        currentExpedientRequest: {
            xhr: null,
            timeout: null,
            expired: true
        },

        /**
         * Inicializa todas as validações
         */
        init: function() {
            console.log('✅ Inicializando módulo Quote Validations...');

            this.initAgeValidation();
            this.initEmailValidation();
            this.initExpedientValidation();
        },

        /**
         * Validação de idade vs data de nascimento
         */
        initAgeValidation: function() {
            const self = this;

            console.log('  🔧 Inicializando validação de idade...');

            // Validar ao mudar data de nascimento
            $(document.body).on('change blur', 'input[name*="[birthDay]"], input[name*="[birthday]"]', function() {
                self.validateAge($(this));
            });

            // Validar todas as idades no submit
            $('form#bookForm').on('submit', function(e) {
                if (!self.validateAllAges()) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            });
        },

        /**
         * Valida idade de um passageiro específico
         * @param {jQuery} $input - Input de data de nascimento
         * @returns {boolean} - True se válido
         */
        validateAge: function($input) {
            const birthDay = $input.val();
            if (!birthDay) return true;

            console.log('🔍 Validando idade para:', birthDay);

            // Encontrar campo de idade correspondente
            const fieldName = $input.attr('name');
            const ageFieldName = fieldName.replace(/\[birthDay\]|\[birthday\]/gi, '[age]');
            const $ageInput = $('input[name="' + ageFieldName + '"]');

            if ($ageInput.length === 0) {
                console.warn('⚠️  Campo de idade não encontrado para:', fieldName);
                return true;
            }

            const declaredAge = parseInt($ageInput.val());
            if (isNaN(declaredAge)) {
                console.warn('⚠️  Idade declarada inválida');
                return true;
            }

            // Data de referência: data de início da viagem ou hoje
            const startDate = window.SoltourApp.searchParams && window.SoltourApp.searchParams.startDate
                ? window.SoltourApp.searchParams.startDate
                : new Date().toISOString().split('T')[0];

            // Calcular idade
            const calculatedAge = this.calculateAge(birthDay, startDate);

            console.log('  📊 Idade declarada:', declaredAge);
            console.log('  📊 Idade calculada:', calculatedAge);

            // Validar
            if (calculatedAge !== declaredAge) {
                const errorMessage = 'A data de nascimento não corresponde à idade informada (' +
                                   declaredAge + ' anos). Idade calculada: ' +
                                   calculatedAge + ' anos.';

                $input[0].setCustomValidity(errorMessage);
                $input.addClass('invalid');

                console.error('❌', errorMessage);
                return false;
            } else {
                $input[0].setCustomValidity('');
                $input.removeClass('invalid');
                console.log('  ✅ Idade válida');
                return true;
            }
        },

        /**
         * Valida todas as idades do formulário
         * @returns {boolean} - True se todas válidas
         */
        validateAllAges: function() {
            const self = this;
            let allValid = true;
            let invalidCount = 0;

            $('input[name*="[birthDay]"], input[name*="[birthday]"]').each(function() {
                if (!self.validateAge($(this))) {
                    allValid = false;
                    invalidCount++;
                }
            });

            if (!allValid) {
                console.error('❌ Validação de idade falhou para', invalidCount, 'passageiros');

                const message = invalidCount === 1
                    ? 'A data de nascimento não corresponde à idade informada.'
                    : 'As datas de nascimento de ' + invalidCount +
                      ' passageiros não correspondem às idades informadas.';

                if (window.SoltourApp.Toast) {
                    window.SoltourApp.Toast.error(message, 6000);
                } else {
                    alert(message);
                }

                $('.js-submit-form').prop('disabled', false);
            }

            return allValid;
        },

        /**
         * Calcula idade baseado em data de nascimento e data de referência
         * @param {string} birthDayStr - Data de nascimento (DD/MM/YYYY ou YYYY-MM-DD)
         * @param {string} startDateStr - Data de referência (YYYY-MM-DD)
         * @returns {number} - Idade calculada
         */
        calculateAge: function(birthDayStr, startDateStr) {
            // Parse birthDay
            let birthDay;
            if (birthDayStr.includes('/')) {
                // Format: DD/MM/YYYY
                const parts = birthDayStr.split('/');
                birthDay = new Date(parts[2], parts[1] - 1, parts[0]);
            } else if (birthDayStr.includes('-')) {
                // Format: YYYY-MM-DD
                const parts = birthDayStr.split('-');
                birthDay = new Date(parts[0], parts[1] - 1, parts[2]);
            } else {
                console.error('❌ Formato de data inválido:', birthDayStr);
                return 0;
            }

            // Parse startDate (YYYY-MM-DD)
            const startParts = startDateStr.split('-');
            const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);

            // Calcular idade
            let age = startDate.getFullYear() - birthDay.getFullYear();
            const monthDiff = startDate.getMonth() - birthDay.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && startDate.getDate() < birthDay.getDate())) {
                age--;
            }

            return age;
        },

        /**
         * Validação de email duplo (confirmação)
         */
        initEmailValidation: function() {
            const self = this;

            const $email = $('#holderMail, #holderEmail, input[name="holderEmail"]');
            const $repeatEmail = $('#holderRepeatMail, #holderRepeatEmail, input[name="holderRepeatEmail"]');

            if ($repeatEmail.length === 0) {
                console.log('  ℹ️  Campo de confirmação de email não encontrado');
                return;
            }

            console.log('  🔧 Inicializando validação de email...');

            $email.on('keyup keypress blur change', function() {
                self.validateEmail();
            });

            $repeatEmail.on('keyup keypress blur change', function() {
                self.validateEmail();
            });
        },

        /**
         * Valida se emails coincidem
         * @returns {boolean} - True se válidos
         */
        validateEmail: function() {
            const $email = $('#holderMail, #holderEmail, input[name="holderEmail"]');
            const $repeatEmail = $('#holderRepeatMail, #holderRepeatEmail, input[name="holderRepeatEmail"]');

            if ($repeatEmail.length === 0) return true;

            const email = $email.val();
            const repeatEmail = $repeatEmail.val();

            if (email !== '' && repeatEmail !== '' && email !== repeatEmail) {
                $repeatEmail[0].setCustomValidity('Os emails não coincidem');
                $repeatEmail.addClass('invalid');
                console.warn('⚠️  Emails não coincidem');
                return false;
            } else {
                $repeatEmail[0].setCustomValidity('');
                $repeatEmail.removeClass('invalid');
                return true;
            }
        },

        /**
         * Validação de expediente em tempo real (com debouncing)
         */
        initExpedientValidation: function() {
            const self = this;

            const $expedientInput = $('.js-validate-expedient, input[name="expedient"]');

            if ($expedientInput.length === 0) {
                console.log('  ℹ️  Campo de expediente não encontrado');
                return;
            }

            console.log('  🔧 Inicializando validação de expediente...');

            $expedientInput.on('input', function() {
                const $input = $(this);

                // Limpar timeout anterior
                if (self.currentExpedientRequest.timeout) {
                    clearTimeout(self.currentExpedientRequest.timeout);
                }

                // Abortar request anterior
                if (self.currentExpedientRequest.xhr &&
                    self.currentExpedientRequest.xhr.readyState !== 4) {
                    self.currentExpedientRequest.xhr.abort();
                }

                // Debounce
                self.currentExpedientRequest.timeout = setTimeout(function() {
                    self.validateExpedient($input);
                }, self.DEBOUNCE_TIME);
            });
        },

        /**
         * Valida expediente via API
         * @param {jQuery} $input - Input de expediente
         */
        validateExpedient: function($input) {
            const self = this;
            const expedient = $input.val();

            if (!expedient || expedient.length < 3) {
                $input[0].setCustomValidity('');
                $input.removeClass('valid invalid');
                return;
            }

            console.log('🔍 Validando expediente:', expedient);

            const clientCode = $('input[name="clientCode"]').val();
            const branchOfficeCode = $('input[name="branchOfficeCode"]').val();

            this.currentExpedientRequest.xhr = $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: {
                    action: 'soltour_validate_expedient',
                    nonce: soltourData.nonce,
                    expedient: expedient,
                    client_code: clientCode,
                    branch_office_code: branchOfficeCode
                },
                success: function(response) {
                    if (response.success && response.data && response.data.valid) {
                        $input[0].setCustomValidity('');
                        $input.removeClass('invalid').addClass('valid');
                        console.log('  ✅ Expediente válido');
                    } else {
                        const message = response.data && response.data.message
                            ? response.data.message
                            : 'Expediente inválido';

                        $input[0].setCustomValidity(message);
                        $input.removeClass('valid').addClass('invalid');
                        console.warn('  ⚠️  Expediente inválido:', message);
                    }

                    $input[0].checkValidity();
                },
                error: function(xhr, status, error) {
                    if (status !== 'abort') {
                        console.error('❌ Erro ao validar expediente:', error);
                        // Não mostrar erro ao usuário em caso de falha na validação
                        $input[0].setCustomValidity('');
                        $input.removeClass('valid invalid');
                    }
                }
            });
        },

        /**
         * Validação de nomes duplicados (servidor)
         * Esta validação é feita no servidor durante o submit
         * Aqui apenas preparamos a estrutura
         */
        checkDuplicatedNames: function(formData, callback) {
            console.log('🔍 Verificando nomes duplicados...');

            // Preparar request
            const rq = $.extend({}, formData, {
                validationType: 'namesAndResidentDocuments'
            });

            showLoadingModal('Validando...', 'Verificando dados dos passageiros');

            $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: {
                    action: 'soltour_validate_passengers',
                    nonce: soltourData.nonce,
                    passenger_data: JSON.stringify(rq)
                },
                success: function(response) {
                    hideLoadingModal();

                    if (response.success) {
                        console.log('  ✅ Nomes validados');
                        callback(true);
                    } else if (response.data && response.data.duplicates) {
                        // Nomes duplicados encontrados - mostrar modal
                        console.warn('  ⚠️  Nomes duplicados encontrados');
                        showDuplicateNamesModal(response.data, callback);
                    } else {
                        // Outro erro
                        console.error('  ❌ Erro na validação:', response);
                        callback(false);
                    }
                },
                error: function(xhr, status, error) {
                    hideLoadingModal();
                    console.error('❌ Erro ao validar nomes:', error);
                    // Fail-safe: permitir continuar
                    callback(true);
                }
            });

            /**
             * Modal de confirmação para nomes duplicados
             */
            function showDuplicateNamesModal(data, callback) {
                const message = data.message || 'Foram encontrados passageiros com nomes semelhantes.';

                // Criar modal simples
                if (confirm(message + '\n\nDeseja continuar mesmo assim?')) {
                    callback(true);
                } else {
                    callback(false);

                    // Focar no campo problemático se fornecido
                    if (data.field) {
                        const $field = $('[name="' + data.field + '"]');
                        if ($field.length) {
                            $field.focus();
                        }
                    }
                }
            }
        }
    };

    // Inicializar quando documento estiver pronto
    $(document).ready(function() {
        if (typeof window.SoltourApp !== 'undefined') {
            window.SoltourApp.QuoteValidations.init();
        }
    });

})(jQuery);
