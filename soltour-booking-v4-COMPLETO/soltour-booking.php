<?php
/**
 * Plugin Name: Soltour Booking V4
 * Plugin URI: https://beautytravel.pt
 * Description: Integração API Soltour V5 - 100% COMPLETA (14/14 funcionalidades implementadas) + Sistema de Email Configurável + Modo de Teste
 * Version: 4.2.6
 * Author: Beauty Travel
 * License: GPL v2 or later
 * Text Domain: soltour-booking
 */

if (!defined('ABSPATH')) exit;

// Definições de constantes
define('SOLTOUR_VERSION', '4.2.6');
define('SOLTOUR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SOLTOUR_PLUGIN_URL', plugin_dir_url(__FILE__));

// Configurações da API - carregadas do wp-config.php
if (!defined('SOLTOUR_API_BASE_URL')) {
    define('SOLTOUR_API_BASE_URL', defined('SOLTOUR_API_BASE_URL') ? constant('SOLTOUR_API_BASE_URL') : 'https://soltour-svcext.grupo-pinero.com/soltour/v5/');
}
if (!defined('SOLTOUR_API_USERNAME')) {
    define('SOLTOUR_API_USERNAME', defined('SOLTOUR_USERNAME') ? constant('SOLTOUR_USERNAME') : 'BEAUTYT999');
}
if (!defined('SOLTOUR_API_PASSWORD')) {
    define('SOLTOUR_API_PASSWORD', defined('SOLTOUR_PASSWORD') ? constant('SOLTOUR_PASSWORD') : 'XMLBEAUTYT999');
}
if (!defined('SOLTOUR_API_CLIENT_ID')) {
    define('SOLTOUR_API_CLIENT_ID', defined('SOLTOUR_CLIENT_ID') ? constant('SOLTOUR_CLIENT_ID') : '1e94b2d9124841b5a5be6fc3e45cf62f');
}
if (!defined('SOLTOUR_API_CLIENT_SECRET')) {
    define('SOLTOUR_API_CLIENT_SECRET', defined('SOLTOUR_CLIENT_SECRET') ? constant('SOLTOUR_CLIENT_SECRET') : 'e653a17e53094393aeF53da7102de2D1');
}
if (!defined('SOLTOUR_API_BRAND')) {
    define('SOLTOUR_API_BRAND', defined('SOLTOUR_BRAND') ? constant('SOLTOUR_BRAND') : 'SOLTOUR');
}
if (!defined('SOLTOUR_API_MARKET')) {
    define('SOLTOUR_API_MARKET', defined('SOLTOUR_MARKET') ? constant('SOLTOUR_MARKET') : 'XMLPT');
}
if (!defined('SOLTOUR_API_LANG')) {
    define('SOLTOUR_API_LANG', defined('SOLTOUR_LANG') ? constant('SOLTOUR_LANG') : 'PT');
}

// Configurações de Email
if (!defined('SOLTOUR_EMAIL_FROM')) {
    define('SOLTOUR_EMAIL_FROM', 'geral@beautytravel.pt');
}
if (!defined('SOLTOUR_EMAIL_FROM_NAME')) {
    define('SOLTOUR_EMAIL_FROM_NAME', 'Beauty Travel');
}
if (!defined('SOLTOUR_EMAIL_REPLY_TO')) {
    define('SOLTOUR_EMAIL_REPLY_TO', 'reservas@beautytravel.pt');
}

// Modo de Teste - Todos os emails vão para este endereço
if (!defined('SOLTOUR_TEST_MODE')) {
    define('SOLTOUR_TEST_MODE', true); // Alterar para false em produção
}
if (!defined('SOLTOUR_TEST_EMAIL')) {
    define('SOLTOUR_TEST_EMAIL', 'andre@wpexperts.pt');
}

/**
 * Classe principal do plugin
 */
class Soltour_Booking {

    private static $instance = null;
    private $api_handler;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->load_dependencies();
        $this->init_hooks();
    }

    private function load_dependencies() {
        require_once SOLTOUR_PLUGIN_DIR . 'includes/class-soltour-api.php';
        require_once SOLTOUR_PLUGIN_DIR . 'includes/class-soltour-shortcodes.php';
        
        $this->api_handler = new Soltour_API();
    }

    private function init_hooks() {
        // Enqueue scripts e styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));

        // Registrar shortcodes
        add_action('init', array($this, 'register_shortcodes'));

        // AJAX endpoints para usuários logados e não logados
        $ajax_actions = array(
            'soltour_get_destinations',
            'soltour_get_origins',
            'soltour_get_calendar_months',
            'soltour_get_price_calendar',
            'soltour_search_packages',
            'soltour_paginate_packages',
            'soltour_get_package_details',
            'soltour_get_alternatives',
            'soltour_check_allowed_selling', // Verificar se venda está permitida
            'soltour_quote_package',
            'soltour_prepare_quote', // NOVO - Validar pacote com fetchAvailability e gerar quote
            'soltour_generate_quote', // NOVO - Gerar cotação final na página de cotação
            'soltour_delayed_quote', // NOVO Sprint 1 - Delayed quote com preços finais
            'soltour_update_optional_service', // NOVO Sprint 1 - Adicionar/remover serviços opcionais
            'soltour_validate_expedient', // NOVO Sprint 1 - Validar expediente em tempo real
            'soltour_validate_passengers', // NOVO Sprint 1 - Validar nomes duplicados
            'soltour_print_quote', // NOVO Sprint 2 - Imprimir cotação
            'soltour_send_quote_email', // NOVO Sprint 2 - Enviar cotação por email
            'soltour_generate_expedient',
            'soltour_book_package',
            'soltour_get_booking_details',
            'soltour_cancel_booking'
        );

        foreach ($ajax_actions as $action) {
            add_action('wp_ajax_' . $action, array($this->api_handler, 'ajax_' . str_replace('soltour_', '', $action)));
            add_action('wp_ajax_nopriv_' . $action, array($this->api_handler, 'ajax_' . str_replace('soltour_', '', $action)));
        }

        // Admin notices
        add_action('admin_notices', array($this, 'check_credentials_notice'));
    }

    public function enqueue_assets() {
        // CSS
        wp_enqueue_style(
            'soltour-booking-style',
            SOLTOUR_PLUGIN_URL . 'assets/css/soltour-style.css',
            array(),
            SOLTOUR_VERSION
        );

        // CSS - Formulário de Busca Moderno
        wp_enqueue_style(
            'soltour-search-form',
            SOLTOUR_PLUGIN_URL . 'assets/css/search-form.css',
            array('soltour-booking-style'),
            SOLTOUR_VERSION
        );

        // CSS - Melhorias na página de resultados
        wp_enqueue_style(
            'soltour-results-improvements',
            SOLTOUR_PLUGIN_URL . 'assets/css/results-improvements.css',
            array('soltour-booking-style'),
            SOLTOUR_VERSION
        );

        // Lottie Player (CDN)
        wp_enqueue_script(
            'lottie-player',
            'https://unpkg.com/@lottiefiles/lottie-player@2.0.2/dist/lottie-player.js',
            array(),
            '2.0.2',
            true
        );

        // JavaScript principal
        wp_enqueue_script(
            'soltour-booking-script',
            SOLTOUR_PLUGIN_URL . 'assets/js/soltour-booking.js',
            array('jquery', 'lottie-player'),
            SOLTOUR_VERSION,
            true
        );

        // Módulo DelayedAvailability
        wp_enqueue_script(
            'soltour-delayed-availability',
            SOLTOUR_PLUGIN_URL . 'assets/js/modules/delayed-availability.js',
            array('jquery', 'soltour-booking-script'),
            SOLTOUR_VERSION,
            true
        );

        // Módulo Toast Notifications
        wp_enqueue_script(
            'soltour-toast-notifications',
            SOLTOUR_PLUGIN_URL . 'assets/js/modules/toast-notifications.js',
            array('jquery', 'soltour-booking-script'),
            SOLTOUR_VERSION,
            true
        );

        // Módulo DelayedQuote
        wp_enqueue_script(
            'soltour-delayed-quote',
            SOLTOUR_PLUGIN_URL . 'assets/js/modules/delayed-quote.js',
            array('jquery', 'soltour-booking-script', 'soltour-toast-notifications'),
            SOLTOUR_VERSION,
            true
        );

        // Módulo Quote Form (com CheckAllowedSelling no submit)
        wp_enqueue_script(
            'soltour-quote-form',
            SOLTOUR_PLUGIN_URL . 'assets/js/modules/quote-form.js',
            array('jquery', 'soltour-booking-script', 'soltour-toast-notifications'),
            SOLTOUR_VERSION,
            true
        );

        // Módulo Optional Services (seguros, transfers, golf, equipagem)
        wp_enqueue_script(
            'soltour-optional-services',
            SOLTOUR_PLUGIN_URL . 'assets/js/modules/optional-services.js',
            array('jquery', 'soltour-booking-script', 'soltour-toast-notifications'),
            SOLTOUR_VERSION,
            true
        );

        // Módulo Quote Validations (idade, email, expediente, nomes duplicados)
        wp_enqueue_script(
            'soltour-quote-validations',
            SOLTOUR_PLUGIN_URL . 'assets/js/modules/quote-validations.js',
            array('jquery', 'soltour-booking-script', 'soltour-toast-notifications'),
            SOLTOUR_VERSION,
            true
        );

        // Módulo Breakdown (desglose dinâmico bruto/líquido)
        wp_enqueue_script(
            'soltour-breakdown',
            SOLTOUR_PLUGIN_URL . 'assets/js/modules/breakdown.js',
            array('jquery', 'soltour-booking-script', 'soltour-toast-notifications'),
            SOLTOUR_VERSION,
            true
        );

        // Módulo Navigation (go back com cache)
        wp_enqueue_script(
            'soltour-navigation',
            SOLTOUR_PLUGIN_URL . 'assets/js/modules/navigation.js',
            array('jquery', 'soltour-booking-script', 'soltour-toast-notifications'),
            SOLTOUR_VERSION,
            true
        );

        // Módulo Copy Holder (copiar titular → primeiro passageiro)
        wp_enqueue_script(
            'soltour-copy-holder',
            SOLTOUR_PLUGIN_URL . 'assets/js/modules/copy-holder.js',
            array('jquery', 'soltour-booking-script'),
            SOLTOUR_VERSION,
            true
        );

        // Formulário de Busca Simplificado (novo fluxo oficial - Passo 1)
        wp_enqueue_style(
            'beauty-travel-simple-search',
            SOLTOUR_PLUGIN_URL . 'assets/css/simple-search.css',
            array(),
            SOLTOUR_VERSION
        );

        wp_enqueue_script(
            'beauty-travel-simple-search',
            SOLTOUR_PLUGIN_URL . 'assets/js/modules/simple-search.js',
            array('jquery', 'soltour-booking-script'),
            SOLTOUR_VERSION,
            true
        );

        // Modal de Busca Detalhada (novo fluxo oficial - Passo 2)
        wp_enqueue_style(
            'beauty-travel-modal-search',
            SOLTOUR_PLUGIN_URL . 'assets/css/modal-search.css',
            array(),
            SOLTOUR_VERSION
        );

        wp_enqueue_script(
            'beauty-travel-modal-search',
            SOLTOUR_PLUGIN_URL . 'assets/js/modules/modal-search.js',
            array('jquery', 'soltour-booking-script'),
            SOLTOUR_VERSION,
            true
        );

        // Quote Page (Cotação) - Nova funcionalidade
        wp_enqueue_style(
            'beauty-travel-quote-page',
            SOLTOUR_PLUGIN_URL . 'assets/css/quote-page.css',
            array(),
            SOLTOUR_VERSION
        );

        wp_enqueue_script(
            'beauty-travel-quote-page',
            SOLTOUR_PLUGIN_URL . 'assets/js/quote-page.js',
            array('jquery', 'soltour-booking-script'),
            SOLTOUR_VERSION,
            true
        );

        // Localize script
        wp_localize_script('soltour-booking-script', 'soltourData', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('soltour_booking_nonce'),
            'lang' => SOLTOUR_API_LANG,
            'currency' => 'EUR',
            'pluginUrl' => SOLTOUR_PLUGIN_URL,
            'strings' => array(
                'loading' => __('A carregar...', 'soltour-booking'),
                'error' => __('Ocorreu um erro. Por favor, tente novamente.', 'soltour-booking'),
                'noResults' => __('Nenhum pacote encontrado.', 'soltour-booking'),
                'selectDates' => __('Selecione as datas', 'soltour-booking'),
                'adults' => __('Adultos', 'soltour-booking'),
                'children' => __('Crianças', 'soltour-booking'),
                'nights' => __('Noites', 'soltour-booking'),
                'loadingMessage' => __('Encontraremos os melhores resultados para sua busca', 'soltour-booking'),
            )
        ));
    }

    public function register_shortcodes() {
        $shortcodes = new Soltour_Shortcodes();
        add_shortcode('soltour_search', array($shortcodes, 'search_form'));
        add_shortcode('soltour_results', array($shortcodes, 'results_page'));
        add_shortcode('soltour_quote', array($shortcodes, 'quote_page')); // Nova página de cotação
        add_shortcode('soltour_checkout', array($shortcodes, 'checkout_page'));
        add_shortcode('soltour_booking_confirmation', array($shortcodes, 'confirmation_page'));
    }

    public function check_credentials_notice() {
        $missing_api_creds = empty(SOLTOUR_API_USERNAME) || empty(SOLTOUR_API_PASSWORD) ||
            empty(SOLTOUR_API_CLIENT_ID) || empty(SOLTOUR_API_CLIENT_SECRET);

        if ($missing_api_creds) {
            ?>
            <div class="notice notice-warning is-dismissible">
                <p><strong>Soltour Booking V4:</strong> Por favor, configure todas as credenciais da API no wp-config.php:</p>
                <ul style="list-style: disc; margin-left: 20px;">
                    <li>SOLTOUR_USERNAME</li>
                    <li>SOLTOUR_PASSWORD</li>
                    <li>SOLTOUR_CLIENT_ID</li>
                    <li>SOLTOUR_CLIENT_SECRET</li>
                    <li>SOLTOUR_BRAND (opcional, default: SOLTOUR)</li>
                    <li>SOLTOUR_MARKET (opcional, default: XMLPT)</li>
                    <li>SOLTOUR_LANG (opcional, default: PT)</li>
                </ul>
            </div>
            <?php
        }

        // Mostrar informação sobre configurações de email
        $is_test_mode = defined('SOLTOUR_TEST_MODE') && SOLTOUR_TEST_MODE === true;
        ?>
        <div class="notice <?php echo $is_test_mode ? 'notice-warning' : 'notice-info'; ?>">
            <p><strong>Soltour Booking V4 - Configurações de Email:</strong></p>

            <?php if ($is_test_mode): ?>
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 10px 0;">
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #856404;">
                    ⚠️ MODO DE TESTE ATIVADO
                </p>
                <p style="margin: 5px 0 0 0; color: #856404;">
                    Todos os emails (agência e clientes) serão enviados para:
                    <strong><?php echo esc_html(SOLTOUR_TEST_EMAIL); ?></strong>
                </p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #856404;">
                    Para desativar o modo de teste, defina <code>SOLTOUR_TEST_MODE</code> como <code>false</code> no arquivo do plugin.
                </p>
            </div>
            <?php else: ?>
            <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 10px 0;">
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #155724;">
                    ✅ MODO DE PRODUÇÃO
                </p>
                <p style="margin: 5px 0 0 0; color: #155724;">
                    Os emails serão enviados para os destinatários reais.
                </p>
            </div>
            <?php endif; ?>

            <ul style="list-style: disc; margin-left: 20px;">
                <li><strong>FROM (remetente):</strong> <?php echo esc_html(SOLTOUR_EMAIL_FROM); ?> (<?php echo esc_html(SOLTOUR_EMAIL_FROM_NAME); ?>)</li>
                <li><strong>REPLY-TO (responder para):</strong> <?php echo esc_html(SOLTOUR_EMAIL_REPLY_TO); ?></li>
                <?php if ($is_test_mode): ?>
                <li><strong>EMAIL DE TESTE:</strong> <?php echo esc_html(SOLTOUR_TEST_EMAIL); ?></li>
                <?php endif; ?>
            </ul>
            <p style="margin-top: 10px;">
                <em>Para alterar estas configurações, adicione as seguintes constantes no wp-config.php:</em><br>
                <code style="background: #f5f5f5; padding: 2px 6px;">define('SOLTOUR_EMAIL_FROM', 'seu-email@dominio.com');</code><br>
                <code style="background: #f5f5f5; padding: 2px 6px;">define('SOLTOUR_EMAIL_FROM_NAME', 'Seu Nome');</code><br>
                <code style="background: #f5f5f5; padding: 2px 6px;">define('SOLTOUR_EMAIL_REPLY_TO', 'responder@dominio.com');</code><br>
                <code style="background: #f5f5f5; padding: 2px 6px;">define('SOLTOUR_TEST_MODE', false); // true para teste, false para produção</code><br>
                <code style="background: #f5f5f5; padding: 2px 6px;">define('SOLTOUR_TEST_EMAIL', 'teste@exemplo.com');</code>
            </p>
        </div>
        <?php
    }
}

/**
 * Inicialização do plugin
 */
function soltour_booking_init() {
    return Soltour_Booking::get_instance();
}
add_action('plugins_loaded', 'soltour_booking_init');

/**
 * Ativação do plugin
 */
register_activation_hook(__FILE__, 'soltour_booking_activate');
function soltour_booking_activate() {
    // Criar tabela para armazenar sessões/tokens se necessário
    flush_rewrite_rules();
    
    // Log de ativação
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('Soltour Booking V2: Plugin ativado com sucesso');
    }
}

/**
 * Desativação do plugin
 */
register_deactivation_hook(__FILE__, 'soltour_booking_deactivate');
function soltour_booking_deactivate() {
    // Limpar transients
    delete_transient('soltour_session_token');
    delete_transient('soltour_destinations');
    flush_rewrite_rules();
    
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('Soltour Booking V2: Plugin desativado');
    }
}
