<?php
/**
 * Soltour Shortcodes
 * Renderiza formulários de busca, resultados, checkout e confirmação
 */

if (!defined('ABSPATH')) exit;

class Soltour_Shortcodes {

    /**
     * Shortcode: [soltour_search]
     * Formulário de busca SIMPLIFICADO (fluxo oficial Soltour)
     * Apenas: Destino + Origem + Mês
     */
    public function search_form($atts) {
        $atts = shortcode_atts(array(
            'style' => 'simple' // 'simple' (novo) ou 'full' (antigo)
        ), $atts);

        ob_start();
        ?>
        <div class="soltour-search-wrapper bt-search-simple">
            <div class="bt-search-header">
                <h2><?php _e('Encontre o seu pacote de sonho', 'soltour-booking'); ?></h2>
                <p><?php _e('Escolha o destino, origem e mês de viagem', 'soltour-booking'); ?></p>
            </div>

            <form id="soltour-search-form-simple" class="soltour-search-form-simple">

                <div class="bt-form-grid">
                    <div class="soltour-form-group">
                        <label for="soltour-destination-simple">
                            <i class="fas fa-map-marker-alt"></i>
                            <?php _e('Para onde quer ir?', 'soltour-booking'); ?>
                        </label>
                        <select id="soltour-destination-simple" name="destination" required>
                            <option value=""><?php _e('Selecione o destino', 'soltour-booking'); ?></option>
                        </select>
                    </div>

                    <div class="soltour-form-group">
                        <label for="soltour-origin-simple">
                            <i class="fas fa-plane-departure"></i>
                            <?php _e('De onde parte?', 'soltour-booking'); ?>
                        </label>
                        <select id="soltour-origin-simple" name="origin" required>
                            <option value=""><?php _e('Selecione a origem', 'soltour-booking'); ?></option>
                        </select>
                    </div>

                    <div class="soltour-form-group">
                        <label for="soltour-month-simple">
                            <i class="fas fa-calendar-alt"></i>
                            <?php _e('Quando quer viajar?', 'soltour-booking'); ?>
                        </label>
                        <select id="soltour-month-simple" name="month" required>
                            <option value=""><?php _e('Selecione o mês', 'soltour-booking'); ?></option>
                            <?php
                            // Próximos 12 meses
                            for ($i = 0; $i < 12; $i++) {
                                $date = date('Y-m', strtotime("+$i months"));
                                $monthName = date_i18n('F Y', strtotime("+$i months"));
                                echo '<option value="' . $date . '">' . $monthName . '</option>';
                            }
                            ?>
                        </select>
                    </div>
                </div>

                <button type="submit" class="soltour-btn soltour-btn-primary bt-btn-search-simple">
                    <i class="fas fa-search"></i>
                    <?php _e('Buscar Destinos', 'soltour-booking'); ?>
                </button>

                <div id="soltour-search-loading" class="soltour-loading" style="display:none;">
                    <span class="spinner"></span>
                    <?php _e('A procurar destinos...', 'soltour-booking'); ?>
                </div>
            </form>

            <!-- Cards de Destinos (serão carregados aqui) -->
            <div id="soltour-destination-cards" class="bt-destination-cards" style="display:none;">
                <h3 class="bt-cards-title"><?php _e('Escolha o seu destino', 'soltour-booking'); ?></h3>
                <div id="soltour-cards-grid" class="bt-cards-grid">
                    <!-- Cards serão inseridos via JavaScript -->
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Shortcode: [soltour_results]
     * Lista de pacotes encontrados
     */
    public function results_page($atts) {
        $atts = shortcode_atts(array(
            'per_page' => 10,
            'show_filters' => 'yes'
        ), $atts);

        ob_start();
        ?>
        <div class="soltour-results-wrapper">
            
            <?php if ($atts['show_filters'] === 'yes'): ?>
            <div class="soltour-filters-sidebar">
                <h3><?php _e('Filtros', 'soltour-booking'); ?></h3>
                
                <div class="soltour-filter-group">
                    <label><?php _e('Ordenar por', 'soltour-booking'); ?></label>
                    <select id="soltour-sort-by">
                        <option value="price-asc"><?php _e('Menor Preço', 'soltour-booking'); ?></option>
                        <option value="price-desc"><?php _e('Maior Preço', 'soltour-booking'); ?></option>
                        <option value="stars-desc"><?php _e('Classificação', 'soltour-booking'); ?></option>
                    </select>
                </div>

                <div class="soltour-filter-group">
                    <label><?php _e('Preço Máximo', 'soltour-booking'); ?></label>
                    <input type="range" id="soltour-max-price" min="0" max="10000" step="100" />
                    <span id="soltour-max-price-value">€ 10.000</span>
                </div>

                <div class="soltour-filter-group">
                    <label><?php _e('Classificação', 'soltour-booking'); ?></label>
                    <div class="soltour-star-filter">
                        <label><input type="checkbox" value="5" /> ⭐⭐⭐⭐⭐</label>
                        <label><input type="checkbox" value="4" /> ⭐⭐⭐⭐</label>
                        <label><input type="checkbox" value="3" /> ⭐⭐⭐</label>
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <div class="soltour-results-main">
                <div class="soltour-results-header">
                    <h2><?php _e('Pacotes Disponíveis', 'soltour-booking'); ?></h2>
                    <span id="soltour-results-count"></span>
                </div>

                <div id="soltour-results-list" class="soltour-packages-grid">
                    <!-- Packages will be loaded here via AJAX -->
                </div>

                <div id="soltour-results-loading" class="soltour-loading" style="display:none;">
                    <span class="spinner"></span>
                    <?php _e('A carregar pacotes...', 'soltour-booking'); ?>
                </div>

                <div class="soltour-pagination" id="soltour-pagination"></div>
            </div>
        </div>

        <!-- Modal de Carregamento Moderno -->
        <div class="soltour-loading-modal-overlay" id="soltour-loading-modal">
            <div class="soltour-loading-modal">
                <!-- Logo Beauty Travel -->
                <img src="<?php echo SOLTOUR_PLUGIN_URL; ?>assets/images/branding/beauty-travel-logo.webp"
                     alt="Beauty Travel"
                     class="loading-logo" />

                <!-- Animação Lottie -->
                <lottie-player
                    class="loading-animation"
                    src="<?php echo SOLTOUR_PLUGIN_URL; ?>assets/images/loading-animation.json"
                    background="transparent"
                    speed="1"
                    loop
                    autoplay>
                </lottie-player>

                <!-- Título (será preenchido dinamicamente) -->
                <h2 class="loading-title" id="loading-modal-title">
                    <?php _e('Buscando pacotes...', 'soltour-booking'); ?>
                </h2>

                <!-- Mensagem -->
                <p class="loading-message" id="loading-modal-message">
                    <?php _e('Encontraremos os melhores resultados para sua busca', 'soltour-booking'); ?>
                </p>

                <!-- Barra de Progresso -->
                <div class="progress-container">
                    <div class="progress-bar"></div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Shortcode: [soltour_package_details]
     * Detalhes de um pacote específico
     */
    public function package_details($atts) {
        error_log('[Soltour] Shortcode package_details EXECUTADO!');
        error_log('[Soltour] Budget na URL: ' . (isset($_GET['budget']) ? $_GET['budget'] : 'N/A'));

        ob_start();
        ?>
        <div class="soltour-package-details-wrapper" style="min-height: 400px; background: #f0f0f0; padding: 20px;">
            <div id="soltour-package-details" style="background: white; padding: 20px; border: 2px solid #019CB8;">
                <!-- Package details loaded via AJAX -->
                <div class="soltour-loading">
                    <span class="spinner"></span>
                    <p><?php _e('A carregar detalhes do pacote...', 'soltour-booking'); ?></p>
                    <p style="font-size: 12px; color: #666;">Debug: Shortcode renderizado com sucesso</p>
                </div>
            </div>
        </div>
        <?php
        $output = ob_get_clean();
        error_log('[Soltour] Shortcode HTML length: ' . strlen($output));
        return $output;
    }

    /**
     * Shortcode: [soltour_quote]
     * Página de cotação - Nova funcionalidade seguindo fluxo oficial Soltour
     */
    public function quote_page($atts) {
        $atts = shortcode_atts(array(
            'title' => __('Cotação do Seu Pacote', 'soltour-booking')
        ), $atts);

        ob_start();
        ?>
        <div class="bt-quote-page" id="soltour-quote-page">
            <!-- Conteúdo será carregado via JavaScript (quote-page.js) -->
            <div class="bt-quote-loading">
                <div class="spinner"></div>
                <h3><?php _e('Carregando detalhes...', 'soltour-booking'); ?></h3>
                <p><?php _e('Aguarde enquanto buscamos as informações do seu pacote', 'soltour-booking'); ?></p>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Shortcode: [soltour_checkout]
     * Página de checkout
     */
    public function checkout_page($atts) {
        ob_start();
        ?>
        <div class="soltour-checkout-wrapper">
            <h2><?php _e('Finalizar Reserva', 'soltour-booking'); ?></h2>

            <div class="soltour-checkout-content">
                <div class="soltour-checkout-main">
                    
                    <form id="soltour-checkout-form">
                        
                        <section class="soltour-section">
                            <h3><?php _e('Titular da Reserva', 'soltour-booking'); ?></h3>
                            <div class="soltour-form-row">
                                <div class="soltour-form-group">
                                    <label><?php _e('Nome', 'soltour-booking'); ?> *</label>
                                    <input type="text" name="holder_first_name" required minlength="2" />
                                </div>
                                <div class="soltour-form-group">
                                    <label><?php _e('Apelido 1', 'soltour-booking'); ?> *</label>
                                    <input type="text" name="holder_last_name1" required minlength="2" />
                                </div>
                            </div>
                            <div class="soltour-form-row">
                                <div class="soltour-form-group">
                                    <label><?php _e('Apelido 2', 'soltour-booking'); ?></label>
                                    <input type="text" name="holder_last_name2" minlength="2" />
                                </div>
                                <div class="soltour-form-group">
                                    <label><?php _e('Email', 'soltour-booking'); ?> *</label>
                                    <input type="email" name="holder_email" required />
                                </div>
                            </div>
                            <div class="soltour-form-row">
                                <div class="soltour-form-group">
                                    <label><?php _e('Telefone', 'soltour-booking'); ?> *</label>
                                    <input type="tel" name="holder_phone" required placeholder="+351..." />
                                </div>
                            </div>
                        </section>

                        <section class="soltour-section">
                            <h3><?php _e('Passageiros', 'soltour-booking'); ?></h3>
                            <div id="soltour-passengers-list">
                                <!-- Dynamic passenger forms -->
                            </div>
                        </section>

                        <section class="soltour-section">
                            <h3><?php _e('Observações', 'soltour-booking'); ?></h3>
                            <textarea name="observations" rows="4" placeholder="<?php _e('Alguma observação ou pedido especial?', 'soltour-booking'); ?>"></textarea>
                        </section>

                        <div class="soltour-terms">
                            <label>
                                <input type="checkbox" name="accept_terms" required />
                                <?php _e('Aceito os termos e condições', 'soltour-booking'); ?> *
                            </label>
                        </div>

                        <button type="submit" class="soltour-btn soltour-btn-primary soltour-btn-large" style="padding: 20px 35px !important; border-radius: 100px !important; background: #019CB8 !important; color: #fff !important; border: none !important; font-size: 18px !important; width: 100% !important;">
                            <?php _e('Confirmar Reserva', 'soltour-booking'); ?>
                        </button>

                        <div id="soltour-checkout-loading" class="soltour-loading" style="display:none;">
                            <span class="spinner"></span>
                            <?php _e('A processar reserva...', 'soltour-booking'); ?>
                        </div>
                    </form>
                </div>

                <div class="soltour-checkout-sidebar">
                    <div class="soltour-booking-summary" id="soltour-booking-summary">
                        <h3><?php _e('Resumo da Reserva', 'soltour-booking'); ?></h3>
                        <!-- Summary loaded via JS -->
                    </div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Shortcode: [soltour_booking_confirmation]
     * Página de confirmação da reserva
     */
    public function confirmation_page($atts) {
        ob_start();
        ?>
        <div class="soltour-confirmation-wrapper">
            <div id="soltour-confirmation-content">
                <div class="soltour-loading">
                    <span class="spinner"></span>
                    <?php _e('A carregar confirmação...', 'soltour-booking'); ?>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}
