<?php
/**
 * Classe de Administração do Plugin Soltour
 * Gerencia o menu administrativo e as páginas de Status e Cotações
 */

if (!defined('ABSPATH')) exit;

class Soltour_Admin {

    private static $instance = null;
    private $api_handler;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        add_action('wp_ajax_soltour_test_connection', array($this, 'ajax_test_connection'));
    }

    public function set_api_handler($api_handler) {
        $this->api_handler = $api_handler;
    }

    /**
     * Registrar o menu principal e submenus
     */
    public function register_admin_menu() {
        // Menu principal
        add_menu_page(
            'Integração Soltour',           // Page title
            'Integração Soltour',           // Menu title
            'manage_options',               // Capability
            'soltour-integration',          // Menu slug
            array($this, 'render_status_page'), // Callback (página padrão será Status)
            'dashicons-airplane',           // Icon
            30                              // Position
        );

        // Submenu: Status
        add_submenu_page(
            'soltour-integration',          // Parent slug
            'Status da Conexão',            // Page title
            'Status',                       // Menu title
            'manage_options',               // Capability
            'soltour-integration',          // Menu slug (mesmo do parent para ser a página padrão)
            array($this, 'render_status_page') // Callback
        );

        // Submenu: Cotações
        add_submenu_page(
            'soltour-integration',          // Parent slug
            'Cotações Enviadas',            // Page title
            'Cotações',                     // Menu title
            'manage_options',               // Capability
            'soltour-quotes',               // Menu slug
            array($this, 'render_quotes_page') // Callback
        );
    }

    /**
     * Enqueue de assets do admin
     */
    public function enqueue_admin_assets($hook) {
        // Só carregar nas páginas do plugin
        if (strpos($hook, 'soltour') === false) {
            return;
        }

        wp_enqueue_style(
            'soltour-admin-style',
            SOLTOUR_PLUGIN_URL . 'assets/css/admin-style.css',
            array(),
            SOLTOUR_VERSION
        );

        wp_enqueue_script(
            'soltour-admin-script',
            SOLTOUR_PLUGIN_URL . 'assets/js/admin-script.js',
            array('jquery'),
            SOLTOUR_VERSION,
            true
        );

        wp_localize_script('soltour-admin-script', 'soltourAdmin', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('soltour_admin_nonce')
        ));
    }

    /**
     * Renderizar página de Status
     */
    public function render_status_page() {
        ?>
        <div class="wrap soltour-admin-page">
            <h1>
                <span class="dashicons dashicons-airplane"></span>
                Status da Integração Soltour
            </h1>

            <div class="soltour-status-container">
                <!-- Informações de Configuração -->
                <div class="soltour-card">
                    <h2>Configurações da API</h2>
                    <table class="widefat striped">
                        <tbody>
                            <tr>
                                <th style="width: 200px;">URL Base:</th>
                                <td><code><?php echo esc_html(SOLTOUR_API_BASE_URL); ?></code></td>
                            </tr>
                            <tr>
                                <th>Username:</th>
                                <td><code><?php echo esc_html(SOLTOUR_API_USERNAME); ?></code></td>
                            </tr>
                            <tr>
                                <th>Brand:</th>
                                <td><code><?php echo esc_html(SOLTOUR_API_BRAND); ?></code></td>
                            </tr>
                            <tr>
                                <th>Market:</th>
                                <td><code><?php echo esc_html(SOLTOUR_API_MARKET); ?></code></td>
                            </tr>
                            <tr>
                                <th>Language:</th>
                                <td><code><?php echo esc_html(SOLTOUR_API_LANG); ?></code></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Configurações de Email -->
                <div class="soltour-card">
                    <h2>Configurações de Email</h2>
                    <table class="widefat striped">
                        <tbody>
                            <tr>
                                <th style="width: 200px;">Remetente (FROM):</th>
                                <td><code><?php echo esc_html(SOLTOUR_EMAIL_FROM); ?></code> (<?php echo esc_html(SOLTOUR_EMAIL_FROM_NAME); ?>)</td>
                            </tr>
                            <tr>
                                <th>Responder Para (REPLY-TO):</th>
                                <td><code><?php echo esc_html(SOLTOUR_EMAIL_REPLY_TO); ?></code></td>
                            </tr>
                            <tr>
                                <th>Modo de Teste:</th>
                                <td>
                                    <?php if (SOLTOUR_TEST_MODE): ?>
                                        <span class="soltour-badge soltour-badge-warning">ATIVO</span>
                                        <span style="margin-left: 10px;">Emails enviados para: <code><?php echo esc_html(SOLTOUR_TEST_EMAIL); ?></code></span>
                                    <?php else: ?>
                                        <span class="soltour-badge soltour-badge-success">PRODUÇÃO</span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Teste de Conexão -->
                <div class="soltour-card">
                    <h2>Teste de Conexão com a API</h2>
                    <p>Clique no botão abaixo para testar a conexão com a API Soltour:</p>

                    <button type="button" id="soltour-test-connection" class="button button-primary button-hero">
                        <span class="dashicons dashicons-cloud"></span>
                        Testar Conexão
                    </button>

                    <div id="soltour-connection-result" style="margin-top: 20px;"></div>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Renderizar página de Cotações
     */
    public function render_quotes_page() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'soltour_quotes';

        // Verificar se a tabela existe
        $table_exists = ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") == $table_name);

        if (!$table_exists) {
            ?>
            <div class="wrap soltour-admin-page">
                <h1>
                    <span class="dashicons dashicons-email"></span>
                    Cotações Enviadas
                </h1>
                <div class="notice notice-warning">
                    <p>A tabela de cotações ainda não foi criada. Ela será criada automaticamente quando a primeira cotação for enviada.</p>
                </div>
            </div>
            <?php
            return;
        }

        // Paginação
        $per_page = 20;
        $current_page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
        $offset = ($current_page - 1) * $per_page;

        // Buscar cotações
        $total_quotes = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
        $quotes = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name ORDER BY created_at DESC LIMIT %d OFFSET %d",
            $per_page,
            $offset
        ));

        $total_pages = ceil($total_quotes / $per_page);
        ?>
        <div class="wrap soltour-admin-page">
            <h1>
                <span class="dashicons dashicons-email"></span>
                Cotações Enviadas
                <span class="soltour-count">(<?php echo esc_html($total_quotes); ?>)</span>
            </h1>

            <?php if (empty($quotes)): ?>
                <div class="notice notice-info">
                    <p>Nenhuma cotação foi enviada ainda.</p>
                </div>
            <?php else: ?>
                <div class="soltour-quotes-list">
                    <?php foreach ($quotes as $quote): ?>
                        <?php
                        $quote_data = json_decode($quote->quote_data, true);
                        $passengers_count = $quote_data['adults'] + $quote_data['children'];
                        ?>
                        <div class="soltour-quote-card">
                            <div class="soltour-quote-header">
                                <div class="soltour-quote-id">
                                    <strong>Cotação #<?php echo esc_html($quote->id); ?></strong>
                                    <span class="soltour-quote-date">
                                        <?php echo esc_html(date_i18n('d/m/Y H:i', strtotime($quote->created_at))); ?>
                                    </span>
                                </div>
                                <div class="soltour-quote-price">
                                    <?php echo esc_html(number_format($quote->total_price, 2, ',', '.')); ?> €
                                </div>
                            </div>

                            <div class="soltour-quote-body">
                                <div class="soltour-quote-row">
                                    <div class="soltour-quote-col">
                                        <strong>Cliente:</strong>
                                        <?php echo esc_html($quote->client_name); ?>
                                    </div>
                                    <div class="soltour-quote-col">
                                        <strong>Email:</strong>
                                        <?php echo esc_html($quote->client_email); ?>
                                    </div>
                                </div>

                                <div class="soltour-quote-row">
                                    <div class="soltour-quote-col">
                                        <strong>Destino:</strong>
                                        <?php echo esc_html($quote_data['destination_name'] ?? 'N/A'); ?>
                                    </div>
                                    <div class="soltour-quote-col">
                                        <strong>Hotel:</strong>
                                        <?php echo esc_html($quote_data['hotel_name'] ?? 'N/A'); ?>
                                    </div>
                                </div>

                                <div class="soltour-quote-row">
                                    <div class="soltour-quote-col">
                                        <strong>Check-in:</strong>
                                        <?php echo esc_html($quote_data['checkin'] ?? 'N/A'); ?>
                                    </div>
                                    <div class="soltour-quote-col">
                                        <strong>Check-out:</strong>
                                        <?php echo esc_html($quote_data['checkout'] ?? 'N/A'); ?>
                                    </div>
                                </div>

                                <div class="soltour-quote-row">
                                    <div class="soltour-quote-col">
                                        <strong>Noites:</strong>
                                        <?php echo esc_html($quote_data['nights'] ?? 'N/A'); ?>
                                    </div>
                                    <div class="soltour-quote-col">
                                        <strong>Passageiros:</strong>
                                        <?php echo esc_html($passengers_count); ?>
                                        (<?php echo esc_html($quote_data['adults']); ?> adulto(s), <?php echo esc_html($quote_data['children']); ?> criança(s))
                                    </div>
                                </div>

                                <div class="soltour-quote-row">
                                    <div class="soltour-quote-col">
                                        <strong>Regime:</strong>
                                        <?php echo esc_html($quote_data['board_name'] ?? 'N/A'); ?>
                                    </div>
                                    <div class="soltour-quote-col">
                                        <strong>Quarto:</strong>
                                        <?php echo esc_html($quote_data['room_name'] ?? 'N/A'); ?>
                                    </div>
                                </div>

                                <?php if (!empty($quote_data['expedient'])): ?>
                                    <div class="soltour-quote-row">
                                        <div class="soltour-quote-col-full">
                                            <strong>Expediente:</strong>
                                            <?php echo esc_html($quote_data['expedient']); ?>
                                        </div>
                                    </div>
                                <?php endif; ?>

                                <?php if (!empty($quote->email_sent_to)): ?>
                                    <div class="soltour-quote-row">
                                        <div class="soltour-quote-col-full">
                                            <span class="soltour-badge soltour-badge-success">
                                                Email enviado para: <?php echo esc_html($quote->email_sent_to); ?>
                                            </span>
                                        </div>
                                    </div>
                                <?php endif; ?>
                            </div>

                            <div class="soltour-quote-footer">
                                <button type="button" class="button soltour-view-details" data-quote-id="<?php echo esc_attr($quote->id); ?>">
                                    Ver Detalhes Completos
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>

                <?php if ($total_pages > 1): ?>
                    <div class="soltour-pagination">
                        <?php
                        echo paginate_links(array(
                            'base' => add_query_arg('paged', '%#%'),
                            'format' => '',
                            'current' => $current_page,
                            'total' => $total_pages,
                            'prev_text' => '« Anterior',
                            'next_text' => 'Próxima »'
                        ));
                        ?>
                    </div>
                <?php endif; ?>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * AJAX: Testar conexão com a API
     */
    public function ajax_test_connection() {
        check_ajax_referer('soltour_admin_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permissão negada.'));
        }

        try {
            // Tentar obter token de acesso
            $token_url = SOLTOUR_API_BASE_URL . 'oauth/token';

            $response = wp_remote_post($token_url, array(
                'timeout' => 30,
                'headers' => array(
                    'Content-Type' => 'application/x-www-form-urlencoded',
                ),
                'body' => array(
                    'grant_type' => 'password',
                    'username' => SOLTOUR_API_USERNAME,
                    'password' => SOLTOUR_API_PASSWORD,
                    'client_id' => SOLTOUR_API_CLIENT_ID,
                    'client_secret' => SOLTOUR_API_CLIENT_SECRET,
                )
            ));

            if (is_wp_error($response)) {
                wp_send_json_error(array(
                    'message' => 'Erro de conexão: ' . $response->get_error_message()
                ));
            }

            $status_code = wp_remote_retrieve_response_code($response);
            $body = json_decode(wp_remote_retrieve_body($response), true);

            if ($status_code === 200 && isset($body['access_token'])) {
                // Testar uma chamada real à API (buscar destinos)
                $destinations_url = SOLTOUR_API_BASE_URL . 'destinations';

                $test_response = wp_remote_get($destinations_url, array(
                    'timeout' => 30,
                    'headers' => array(
                        'Authorization' => 'Bearer ' . $body['access_token'],
                        'brand' => SOLTOUR_API_BRAND,
                        'market' => SOLTOUR_API_MARKET,
                        'lang' => SOLTOUR_API_LANG,
                    )
                ));

                if (is_wp_error($test_response)) {
                    wp_send_json_error(array(
                        'message' => 'Autenticação OK, mas erro ao buscar destinos: ' . $test_response->get_error_message()
                    ));
                }

                $test_status = wp_remote_retrieve_response_code($test_response);
                $test_body = json_decode(wp_remote_retrieve_body($test_response), true);

                if ($test_status === 200) {
                    $destinations_count = isset($test_body['destination']) ? count($test_body['destination']) : 0;

                    wp_send_json_success(array(
                        'message' => 'Conexão com a API Soltour estabelecida com sucesso!',
                        'details' => array(
                            'token_obtained' => true,
                            'destinations_count' => $destinations_count,
                            'api_version' => 'v5',
                            'timestamp' => current_time('mysql')
                        )
                    ));
                } else {
                    wp_send_json_error(array(
                        'message' => 'Autenticação OK, mas erro ao buscar destinos. Status: ' . $test_status
                    ));
                }
            } else {
                wp_send_json_error(array(
                    'message' => 'Falha na autenticação. Verifique as credenciais.',
                    'status_code' => $status_code,
                    'response' => $body
                ));
            }

        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => 'Erro inesperado: ' . $e->getMessage()
            ));
        }
    }
}
