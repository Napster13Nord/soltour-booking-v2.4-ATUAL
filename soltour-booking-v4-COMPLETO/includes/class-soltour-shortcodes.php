<?php
/**
 * Soltour Shortcodes
 * Renderiza formulários de busca, resultados, checkout e confirmação
 */

if (!defined('ABSPATH')) exit;

class Soltour_Shortcodes {

    /**
     * Shortcode: [soltour_search]
     * Formulário de busca com calendário
     */
    public function search_form($atts) {
        $atts = shortcode_atts(array(
            'default_nights' => 7,
            'default_adults' => 2,
            'default_children' => 0,
            'show_calendar' => 'yes'
        ), $atts);

        ob_start();
        ?>
        <div class="soltour-search-wrapper">
            <form id="soltour-search-form" class="soltour-search-form">
                
                <div class="soltour-form-row">
                    <div class="soltour-form-group">
                        <label for="soltour-destination"><?php _e('Destino', 'soltour-booking'); ?></label>
                        <select id="soltour-destination" name="destination" required>
                            <option value=""><?php _e('Selecione um destino', 'soltour-booking'); ?></option>
                        </select>
                    </div>

                    <div class="soltour-form-group">
                        <label for="soltour-origin"><?php _e('Origem', 'soltour-booking'); ?></label>
                        <select id="soltour-origin" name="origin" required>
                            <option value=""><?php _e('Selecione a origem', 'soltour-booking'); ?></option>
                        </select>
                    </div>
                </div>

                <div class="soltour-form-row">
                    <div class="soltour-form-group">
                        <label for="soltour-start-date"><?php _e('Data de Partida', 'soltour-booking'); ?></label>
                        <input type="date" id="soltour-start-date" name="start_date" required 
                               min="<?php echo date('Y-m-d'); ?>" />
                    </div>

                    <div class="soltour-form-group">
                        <label for="soltour-nights"><?php _e('Noites', 'soltour-booking'); ?></label>
                        <select id="soltour-nights" name="nights">
                            <?php for ($i = 3; $i <= 21; $i++): ?>
                                <option value="<?php echo $i; ?>" <?php selected($i, $atts['default_nights']); ?>>
                                    <?php echo $i; ?> <?php _e('noites', 'soltour-booking'); ?>
                                </option>
                            <?php endfor; ?>
                        </select>
                    </div>
                </div>

                <div class="soltour-form-row">
                    <div class="soltour-form-group">
                        <label for="soltour-adults"><?php _e('Adultos', 'soltour-booking'); ?></label>
                        <select id="soltour-adults" name="adults">
                            <?php for ($i = 1; $i <= 8; $i++): ?>
                                <option value="<?php echo $i; ?>" <?php selected($i, $atts['default_adults']); ?>>
                                    <?php echo $i; ?>
                                </option>
                            <?php endfor; ?>
                        </select>
                    </div>

                    <div class="soltour-form-group">
                        <label for="soltour-children"><?php _e('Crianças (0-17)', 'soltour-booking'); ?></label>
                        <select id="soltour-children" name="children">
                            <?php for ($i = 0; $i <= 6; $i++): ?>
                                <option value="<?php echo $i; ?>" <?php selected($i, $atts['default_children']); ?>>
                                    <?php echo $i; ?>
                                </option>
                            <?php endfor; ?>
                        </select>
                    </div>
                </div>

                <div id="soltour-children-ages" style="display:none;">
                    <label><?php _e('Idades das Crianças', 'soltour-booking'); ?></label>
                    <div id="soltour-children-ages-inputs"></div>
                </div>

                <?php if ($atts['show_calendar'] === 'yes'): ?>
                <div class="soltour-price-calendar-wrapper" id="soltour-price-calendar" style="display:none;">
                    <h3><?php _e('Selecione a Data', 'soltour-booking'); ?></h3>
                    <div class="soltour-calendar-nav">
                        <button type="button" id="soltour-prev-month">&larr; <?php _e('Anterior', 'soltour-booking'); ?></button>
                        <span id="soltour-current-month"></span>
                        <button type="button" id="soltour-next-month"><?php _e('Próximo', 'soltour-booking'); ?> &rarr;</button>
                    </div>
                    <div id="soltour-calendar-grid"></div>
                </div>
                <?php endif; ?>

                <button type="submit" class="soltour-btn soltour-btn-primary" style="padding: 20px 35px !important; border-radius: 100px !important; background: #019CB8 !important; color: #fff !important; border: none !important; font-size: 16px !important; font-weight: 600 !important;">
                    <?php _e('Pesquisar Pacotes', 'soltour-booking'); ?>
                </button>

                <div id="soltour-search-loading" class="soltour-loading" style="display:none;">
                    <span class="spinner"></span>
                    <?php _e('A procurar...', 'soltour-booking'); ?>
                </div>
            </form>
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

                <div id="soltour-no-results" style="display:none;">
                    <p><?php _e('Nenhum pacote encontrado com esses critérios.', 'soltour-booking'); ?></p>
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
                    src="<?php echo SOLTOUR_PLUGIN_URL; ?>assets/images/loading-animation.lottie"
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
        ob_start();
        ?>
        <div class="soltour-package-details-wrapper">
            <div id="soltour-package-details">
                <!-- Package details loaded via AJAX -->
                <div class="soltour-loading">
                    <span class="spinner"></span>
                    <?php _e('A carregar detalhes do pacote...', 'soltour-booking'); ?>
                </div>
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
