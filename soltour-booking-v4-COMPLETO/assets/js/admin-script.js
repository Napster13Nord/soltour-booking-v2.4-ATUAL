/**
 * Scripts da Área Administrativa do Plugin Soltour
 */

(function($) {
    'use strict';

    $(document).ready(function() {

        /**
         * Teste de Conexão com a API
         */
        $('#soltour-test-connection').on('click', function(e) {
            e.preventDefault();

            var $button = $(this);
            var $result = $('#soltour-connection-result');

            // Desabilitar botão e mostrar loading
            $button.prop('disabled', true);
            $result.html(
                '<div class="soltour-test-result">' +
                '<span class="spinner is-active"></span>' +
                '<strong>Testando conexão com a API Soltour...</strong>' +
                '</div>'
            ).addClass('show');

            // Fazer requisição AJAX
            $.ajax({
                url: soltourAdmin.ajaxurl,
                type: 'POST',
                data: {
                    action: 'soltour_test_connection',
                    nonce: soltourAdmin.nonce
                },
                success: function(response) {
                    if (response.success) {
                        var details = response.data.details || {};
                        var html = '<div class="soltour-test-result success">' +
                                   '<h3>✓ ' + response.data.message + '</h3>';

                        if (details.destinations_count !== undefined) {
                            html += '<ul>' +
                                    '<li><strong>Autenticação:</strong> ' + (details.authentication || 'OK') + '</li>' +
                                    '<li><strong>Destinos disponíveis:</strong> ' + details.destinations_count + '</li>' +
                                    '<li><strong>Versão da API:</strong> ' + details.api_version + '</li>';

                            if (details.brand) {
                                html += '<li><strong>Brand:</strong> ' + details.brand + '</li>';
                            }
                            if (details.market) {
                                html += '<li><strong>Market:</strong> ' + details.market + '</li>';
                            }

                            html += '<li><strong>Timestamp:</strong> ' + details.timestamp + '</li>' +
                                    '</ul>';
                        }

                        html += '</div>';
                        $result.html(html);
                    } else {
                        var errorMsg = response.data && response.data.message
                            ? response.data.message
                            : 'Erro desconhecido ao testar conexão.';

                        var html = '<div class="soltour-test-result error">' +
                                   '<h3>✗ Falha no Teste de Conexão</h3>' +
                                   '<p>' + errorMsg + '</p>';

                        if (response.data && response.data.status_code) {
                            html += '<p><strong>Status Code:</strong> ' + response.data.status_code + '</p>';
                        }

                        if (response.data && response.data.details) {
                            html += '<details style="margin-top: 10px;">' +
                                    '<summary style="cursor: pointer; font-weight: bold;">Detalhes técnicos</summary>' +
                                    '<pre style="background: #f5f5f5; padding: 10px; margin-top: 5px; overflow: auto;">' +
                                    JSON.stringify(response.data.details, null, 2) +
                                    '</pre>' +
                                    '</details>';
                        }

                        html += '</div>';
                        $result.html(html);
                    }
                },
                error: function(xhr, status, error) {
                    var html = '<div class="soltour-test-result error">' +
                               '<h3>✗ Erro de Comunicação</h3>' +
                               '<p>Não foi possível comunicar com o servidor.</p>' +
                               '<p><strong>Erro:</strong> ' + error + '</p>' +
                               '</div>';
                    $result.html(html);
                },
                complete: function() {
                    // Reabilitar botão
                    $button.prop('disabled', false);
                }
            });
        });

        /**
         * Ver Detalhes Completos da Cotação (placeholder)
         */
        $(document).on('click', '.soltour-view-details', function(e) {
            e.preventDefault();

            var quoteId = $(this).data('quote-id');

            // TODO: Implementar modal com detalhes completos
            alert('Visualização detalhada da cotação #' + quoteId + ' será implementada em breve.');
        });

    });

})(jQuery);
