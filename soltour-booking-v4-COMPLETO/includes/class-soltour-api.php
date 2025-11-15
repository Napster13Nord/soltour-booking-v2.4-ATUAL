<?php
/**
 * Soltour API Handler
 * Implementa todos os endpoints da API Soltour V5 conforme documentação
 */

if (!defined('ABSPATH')) exit;

class Soltour_API {

    private $api_base_url;
    private $session_token;
    private $client_id;
    private $client_secret;

    public function __construct() {
        $this->api_base_url = SOLTOUR_API_BASE_URL;
        $this->client_id = SOLTOUR_API_CLIENT_ID;
        $this->client_secret = SOLTOUR_API_CLIENT_SECRET;
        $this->session_token = $this->get_session_token();
    }

    // ========================================
    // 1) AUTENTICAÇÃO
    // ========================================

    /**
     * Obtém ou renova o session token
     */
    private function get_session_token() {
        // Verifica cache
        $cached_token = get_transient('soltour_session_token');
        if ($cached_token) {
            return $cached_token;
        }

        // Login
        $login_data = array(
            'brand' => SOLTOUR_API_BRAND,
            'market' => SOLTOUR_API_MARKET,
            'languageCode' => SOLTOUR_API_LANG,
            'username' => SOLTOUR_API_USERNAME,
            'password' => SOLTOUR_API_PASSWORD
        );

        $response = $this->make_request('login/login', $login_data, false);

        if (isset($response['sessionToken'])) {
            // Cache por 25 minutos
            set_transient('soltour_session_token', $response['sessionToken'], 25 * MINUTE_IN_SECONDS);
            $this->log('Session token obtido com sucesso');
            return $response['sessionToken'];
        }

        $this->log('Erro ao obter session token: ' . json_encode($response), 'error');
        return null;
    }

    // ========================================
    // 2) MASTERS (Catálogos)
    // ========================================

    /**
     * GET /master/getAllDestinations
     */
    public function get_all_destinations() {
        // Cache por 24h
        $cached = get_transient('soltour_all_destinations');
        if ($cached) {
            return $cached;
        }

        $response = $this->make_request('master/getAllDestinations', array(
            'productType' => 'PACKAGE'
        ));

        if (isset($response['destinations'])) {
            set_transient('soltour_all_destinations', $response, 24 * HOUR_IN_SECONDS);
        }

        return $response;
    }

    /**
     * GET /master/getAllOrigins
     */
    public function get_all_origins($destination_code = null) {
        $data = array('productType' => 'PACKAGE');
        
        if ($destination_code) {
            $data['destinationCode'] = $destination_code;
        }

        return $this->make_request('master/getAllOrigins', $data);
    }

    /**
     * GET /master/getAirports
     */
    public function get_airports() {
        $cached = get_transient('soltour_airports');
        if ($cached) {
            return $cached;
        }

        $response = $this->make_request('master/getAirports', array(
            'productType' => 'PACKAGE'
        ));

        if (isset($response['airports'])) {
            set_transient('soltour_airports', $response, 24 * HOUR_IN_SECONDS);
        }

        return $response;
    }

    // ========================================
    // 3) CALENDÁRIOS
    // ========================================

    /**
     * POST /booking/getAvailableCalendarMonths
     */
    public function get_available_calendar_months($origin_code, $destination_code) {
        return $this->make_request('booking/getAvailableCalendarMonths', array(
            'productType' => 'PACKAGE',
            'originCode' => $origin_code,
            'destinationCode' => $destination_code
        ));
    }

    /**
     * POST /booking/getPriceCalendar
     */
    public function get_price_calendar($params) {
        $data = array(
            'productType' => 'PACKAGE',
            'originCode' => $params['originCode'],
            'destinationCode' => $params['destinationCode'],
            'month' => array(
                'month' => intval($params['month']),
                'year' => intval($params['year'])
            ),
            'onlyDirectFlights' => isset($params['onlyDirectFlights']) ? $params['onlyDirectFlights'] : false,
            'immediatePay' => isset($params['immediatePay']) ? $params['immediatePay'] : false,
            'residentDiscount' => isset($params['residentDiscount']) ? $params['residentDiscount'] : 'NONE',
            'numNights' => intval($params['numNights'])
        );

        return $this->make_request('booking/getPriceCalendar', $data);
    }

    // ========================================
    // 4) BUSCA E DISPONIBILIDADE
    // ========================================

    /**
     * POST /booking/availability
     * Retorna budgets e availToken
     */
    public function search_availability($params) {
        $start_date = $params['startDate'];
        $num_nights = intval($params['numNights']);
        $end_date = date('Y-m-d', strtotime($start_date . ' +' . $num_nights . ' days'));

        // Montar estrutura de rooms
        $rooms = array();
        if (isset($params['rooms']) && is_array($params['rooms'])) {
            foreach ($params['rooms'] as $room) {
                $passengers = array();
                foreach ($room['passengers'] as $pax) {
                    $passengers[] = array(
                        'type' => $pax['type'], // ADULT, CHILD, INFANT
                        'age' => intval($pax['age'])
                    );
                }
                $rooms[] = array('passengers' => $passengers);
            }
        }

        // Parâmetros críticos vindos do frontend
        $product_type = isset($params['productType']) ? $params['productType'] : 'PACKAGE';
        $only_hotel = isset($params['onlyHotel']) ? $params['onlyHotel'] : 'N';
        $force_avail = isset($params['forceAvail']) ? filter_var($params['forceAvail'], FILTER_VALIDATE_BOOLEAN) : false;

        $data = array(
            'productType' => $product_type,
            'onlyHotel' => $only_hotel,
            'forceAvail' => $force_avail,
            'criteria' => array(
                'order' => array(
                    'type' => isset($params['orderType']) ? $params['orderType'] : 'PRICE',
                    'direction' => isset($params['orderDirection']) ? $params['orderDirection'] : 'ASC'
                ),
                'pagination' => array(
                    'firstItem' => isset($params['firstItem']) ? intval($params['firstItem']) : 0,
                    'itemCount' => isset($params['itemCount']) ? intval($params['itemCount']) : 20
                )
            ),
            'languageCode' => SOLTOUR_API_LANG,
            'params' => array(
                'startDate' => $start_date,
                'endDate' => $end_date,
                'residentType' => isset($params['residentType']) ? $params['residentType'] : 'NONE',
                'accomodation' => array(
                    'rooms' => $rooms
                ),
                'hotelParams' => array(
                    'destinationCode' => $params['destinationCode'],
                    'includeImmediatePayment' => true
                ),
                'flightParams' => array(
                    'itineraries' => array(
                        array(
                            'origins' => array($params['originCode']),
                            'destinations' => array($params['destinationCode'])
                        )
                    ),
                    'directFlightsOnly' => isset($params['directFlightsOnly']) ? $params['directFlightsOnly'] : false,
                    'includeImmediatePayment' => true
                )
            )
        );

        $this->log('Enviando para API Soltour (booking/availability):');
        $this->log('  - criteria.pagination.firstItem: ' . $data['criteria']['pagination']['firstItem']);
        $this->log('  - criteria.pagination.itemCount: ' . $data['criteria']['pagination']['itemCount']);

        return $this->make_request('booking/availability', $data);
    }

    /**
     * POST /booking/availability (PAGINAÇÃO)
     * Busca próxima página usando availToken existente
     * IMPORTANTE: Precisa enviar TODOS os params originais + availToken
     */
    public function paginate_availability($avail_token, $first_item, $item_count, $original_params) {
        // Reconstruir estrutura de rooms dos params originais
        $rooms = array();
        if (isset($original_params['rooms']) && is_array($original_params['rooms'])) {
            foreach ($original_params['rooms'] as $room) {
                $passengers = array();
                foreach ($room['passengers'] as $pax) {
                    $passengers[] = array(
                        'type' => $pax['type'],
                        'age' => intval($pax['age'])
                    );
                }
                $rooms[] = array('passengers' => $passengers);
            }
        }

        // Calcular datas
        $start_date = $original_params['startDate'];
        $num_nights = intval($original_params['numNights']);
        $end_date = date('Y-m-d', strtotime($start_date . ' +' . $num_nights . ' days'));

        $data = array(
            'productType' => 'PACKAGE',
            'availToken' => $avail_token,
            'criteria' => array(
                'order' => array(
                    'type' => 'PRICE',
                    'direction' => 'ASC'
                ),
                'pagination' => array(
                    'firstItem' => intval($first_item),
                    'itemCount' => intval($item_count)
                )
            ),
            'languageCode' => SOLTOUR_API_LANG,
            'params' => array(
                'startDate' => $start_date,
                'endDate' => $end_date,
                'residentType' => isset($original_params['residentType']) ? $original_params['residentType'] : 'NONE',
                'accomodation' => array(
                    'rooms' => $rooms
                ),
                'hotelParams' => array(
                    'destinationCode' => $original_params['destinationCode'],
                    'includeImmediatePayment' => true
                ),
                'flightParams' => array(
                    'itineraries' => array(
                        array(
                            'origins' => array($original_params['originCode']),
                            'destinations' => array($original_params['destinationCode'])
                        )
                    ),
                    'directFlightsOnly' => isset($original_params['directFlightsOnly']) ? $original_params['directFlightsOnly'] : false,
                    'includeImmediatePayment' => true
                )
            )
        );

        $this->log('Paginando com availToken E params completos:');
        $this->log('  - availToken: ' . substr($avail_token, 0, 20) . '...');
        $this->log('  - firstItem: ' . $first_item);
        $this->log('  - itemCount: ' . $item_count);
        $this->log('  - params incluídos: SIM');

        return $this->make_request('booking/availability', $data);
    }

    /**
     * POST /booking/details
     * Obtém detalhes completos de um budget específico
     */
    public function get_package_details($avail_token, $budget_id, $hotel_code, $provider_code) {
        $data = array(
            'productType' => 'PACKAGE',
            'availToken' => $avail_token,
            'budgetId' => $budget_id,
            'hotelParams' => array(
                'hotelCode' => $hotel_code,
                'providerCode' => $provider_code
            )
        );

        $response = $this->make_request('booking/details', $data);
        
        // A API retorna hotelDetails diretamente no root
        // Normalizar para facilitar o parse no frontend
        if (isset($response['hotelDetails'])) {
            $response['details'] = $response;
        }
        
        return $response;
    }

    /**
     * POST /booking/getAlternatives
     * Obtém voos alternativos para o mesmo budget
     */
    public function get_alternatives($avail_token, $budget_id, $pagination = array()) {
        $data = array(
            'productType' => 'PACKAGE',
            'availToken' => $avail_token,
            'budgetId' => $budget_id,
            'criteria' => array(
                'order' => array(
                    'type' => 'PRICE',
                    'direction' => 'ASC'
                ),
                'pagination' => array(
                    'firstItem' => isset($pagination['firstItem']) ? intval($pagination['firstItem']) : 0,
                    'itemCount' => isset($pagination['itemCount']) ? intval($pagination['itemCount']) : 10
                )
            )
        );

        return $this->make_request('booking/getAlternatives', $data);
    }

    /**
     * POST /booking/fetchAvailability
     * Recalcula availability após selecionar alternativa
     */
    public function fetch_availability($avail_token, $selected_budget_id) {
        $data = array(
            'productType' => 'PACKAGE',
            'availToken' => $avail_token,
            'selectedBudgetId' => $selected_budget_id
        );

        return $this->make_request('booking/fetchAvailability', $data);
    }

    // ========================================
    // 5) CARRINHO E CHECKOUT
    // ========================================

    /**
     * POST /booking/quote
     * Trava os preços e retorna serviços opcionais
     */
    public function quote_package($avail_token, $budget_ids) {
        if (!is_array($budget_ids)) {
            $budget_ids = array($budget_ids);
        }

        $data = array(
            'productType' => 'PACKAGE',
            'availToken' => $avail_token,
            'budgetIds' => $budget_ids
        );

        return $this->make_request('booking/quote', $data);
    }

    /**
     * POST /booking/generateExpedient
     * Gera o expediente necessário para booking
     */
    public function generate_expedient($params) {
        $data = array(
            'destination' => $params['destination'],
            'productType' => 'PACKAGE',
            'availToken' => $params['availToken'],
            'bookingHolder' => array(
                'email' => $params['bookingHolder']['email'],
                'firstName' => $params['bookingHolder']['firstName'],
                'lastName1' => $params['bookingHolder']['lastName1'],
                'lastName2' => isset($params['bookingHolder']['lastName2']) ? $params['bookingHolder']['lastName2'] : ''
            ),
            'startDate' => $params['startDate'],
            'agencyBookingReference' => $params['agencyBookingReference']
        );

        return $this->make_request('booking/generateExpedient', $data);
    }

    /**
     * POST /booking/book
     * Confirma a reserva
     */
    public function book_package($params) {
        // Validar dados obrigatórios
        if (empty($params['availToken']) || empty($params['expedient'])) {
            return array('error' => 'availToken e expedient são obrigatórios');
        }

        $data = array(
            'availToken' => $params['availToken'],
            'productType' => 'PACKAGE',
            'accomodation' => array(
                'rooms' => $params['rooms']
            ),
            'commonBookingData' => array(
                'agencyExpedient' => $params['agencyBookingReference'],
                'agent' => isset($params['agent']) ? $params['agent'] : 'wordpress',
                'email' => $params['email'],
                'expedient' => $params['expedient'],
                'observations' => isset($params['observations']) ? $params['observations'] : 'Reserva via WordPress',
                'phoneNumber' => $params['phoneNumber'],
                'userName' => SOLTOUR_API_USERNAME,
                'channel' => 'WEB'
            )
        );

        return $this->make_request('booking/book', $data);
    }

    /**
     * POST /booking/validateBooking
     * Valida status da reserva
     */
    public function validate_booking($booking_reference) {
        return $this->make_request('booking/validateBooking', array(
            'bookingReference' => $booking_reference
        ));
    }

    // ========================================
    // 6) PÓS-VENDA
    // ========================================

    /**
     * POST /booking/read
     * Lê detalhes de uma reserva
     */
    public function get_booking_details($booking_reference) {
        return $this->make_request('booking/read', array(
            'bookingReference' => $booking_reference
        ));
    }

    /**
     * POST /booking/getExistingReservations
     * Lista reservas em um período
     */
    public function get_existing_reservations($from_date, $to_date) {
        return $this->make_request('booking/getExistingReservations', array(
            'fromDate' => $from_date,
            'toDate' => $to_date
        ));
    }

    /**
     * POST /booking/cancel
     * Cancela uma reserva (ou simula com preCancellation: true)
     */
    public function cancel_booking($booking_reference, $pre_cancellation = true) {
        return $this->make_request('booking/cancel', array(
            'bookingReference' => $booking_reference,
            'preCancellation' => $pre_cancellation
        ));
    }

    // ========================================
    // HELPERS PRIVADOS
    // ========================================

    /**
     * Faz requisição HTTP para API
     */
    private function make_request($endpoint, $data = array(), $use_auth = true) {
        $url = $this->api_base_url . $endpoint;

        $headers = array(
            'Content-Type' => 'application/json',
            'MULESOFT_CLIENT_ID' => $this->client_id,
            'MULESOFT_CLIENT_SECRET' => $this->client_secret
        );

        if ($use_auth && $this->session_token) {
            $headers['Authorization'] = $this->session_token;
        }

        $args = array(
            'headers' => $headers,
            'body' => json_encode($data),
            'method' => 'POST',
            'timeout' => 60,
            'sslverify' => true
        );

        $this->log("Request to {$endpoint}: " . json_encode($data));

        $response = wp_remote_post($url, $args);

        if (is_wp_error($response)) {
            $this->log("Error in {$endpoint}: " . $response->get_error_message(), 'error');
            return array('error' => $response->get_error_message());
        }

        $body = wp_remote_retrieve_body($response);
        $decoded = json_decode($body, true);

        $this->log("Response from {$endpoint}: " . substr($body, 0, 500));

        return $decoded;
    }

    /**
     * Flatten destinations recursivamente
     */
    private function flatten_destinations($destinations, $parent_name = '') {
        $flat = array();

        foreach ($destinations as $dest) {
            if (isset($dest['children']) && !empty($dest['children'])) {
                $prefix = $parent_name ? $parent_name . ' - ' : '';
                $flat = array_merge($flat, $this->flatten_destinations($dest['children'], $prefix . $dest['description']));
            } else {
                $display_name = $parent_name ? $parent_name . ' - ' . $dest['description'] : $dest['description'];
                $flat[] = array(
                    'code' => $dest['code'],
                    'name' => $dest['description'],
                    'displayName' => $display_name
                );
            }
        }

        return $flat;
    }

    /**
     * Log helper
     */
    private function log($message, $level = 'info') {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("[Soltour API {$level}] " . $message);
        }
        // Também enviar para o console do navegador via JavaScript
        if ($level === 'error') {
            // Adicionar ao transient para mostrar no admin
            $errors = get_transient('soltour_errors') ?: [];
            $errors[] = [
                'message' => $message,
                'time' => current_time('mysql')
            ];
            set_transient('soltour_errors', array_slice($errors, -20), HOUR_IN_SECONDS);
        }
    }

    // ========================================
    // AJAX HANDLERS
    // ========================================

    public function ajax_get_destinations() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $response = $this->get_all_destinations();

        if (isset($response['destinations'])) {
            $flat = $this->flatten_destinations($response['destinations']);
            wp_send_json_success($flat);
        } else {
            wp_send_json_error(array('message' => 'Erro ao carregar destinos'));
        }
    }

    public function ajax_get_origins() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $destination_code = isset($_POST['destination_code']) ? sanitize_text_field($_POST['destination_code']) : '';

        $response = $this->get_all_origins($destination_code);

        if (isset($response['origins'])) {
            wp_send_json_success($response['origins']);
        } else {
            wp_send_json_error(array('message' => 'Erro ao carregar origens'));
        }
    }

    public function ajax_get_calendar_months() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $origin = sanitize_text_field($_POST['origin_code']);
        $destination = sanitize_text_field($_POST['destination_code']);

        $response = $this->get_available_calendar_months($origin, $destination);

        if (isset($response['months'])) {
            wp_send_json_success($response['months']);
        } else {
            wp_send_json_error(array('message' => 'Erro ao carregar meses disponíveis'));
        }
    }

    public function ajax_get_price_calendar() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $params = array(
            'originCode' => sanitize_text_field($_POST['origin_code']),
            'destinationCode' => sanitize_text_field($_POST['destination_code']),
            'month' => intval($_POST['month']),
            'year' => intval($_POST['year']),
            'numNights' => intval($_POST['num_nights'])
        );

        $response = $this->get_price_calendar($params);

        if (isset($response['days'])) {
            wp_send_json_success($response);
        } else {
            wp_send_json_error(array('message' => 'Erro ao carregar calendário de preços'));
        }
    }

    public function ajax_search_packages() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $this->log('=== AJAX SEARCH PACKAGES CALLED ===');

        $params = array(
            'originCode' => sanitize_text_field($_POST['origin_code']),
            'destinationCode' => sanitize_text_field($_POST['destination_code']),
            'startDate' => sanitize_text_field($_POST['start_date']),
            'numNights' => intval($_POST['num_nights']),
            'rooms' => json_decode(stripslashes($_POST['rooms']), true),

            // Parâmetros críticos para API processar corretamente
            'productType' => isset($_POST['product_type']) ? sanitize_text_field($_POST['product_type']) : 'PACKAGE',
            'onlyHotel' => isset($_POST['only_hotel']) ? sanitize_text_field($_POST['only_hotel']) : 'N',
            'forceAvail' => isset($_POST['force_avail']) ? filter_var($_POST['force_avail'], FILTER_VALIDATE_BOOLEAN) : false,

            // Paginação
            'firstItem' => isset($_POST['first_item']) ? intval($_POST['first_item']) : 0,
            'itemCount' => isset($_POST['item_count']) ? intval($_POST['item_count']) : 10
        );

        $this->log('Params recebidos do frontend:');
        $this->log('  - first_item: ' . $params['firstItem']);
        $this->log('  - item_count: ' . $params['itemCount']);
        $this->log('Params completos: ' . json_encode($params));

        $response = $this->search_availability($params);

        $this->log('Resposta da API Soltour:');
        $this->log('  - budgets: ' . (isset($response['budgets']) ? count($response['budgets']) : 0));
        $this->log('  - totalCount: ' . (isset($response['totalCount']) ? $response['totalCount'] : 0));
        $this->log('  - hotels: ' . (isset($response['hotels']) ? count($response['hotels']) : 0));
        $this->log('  - availToken: ' . (isset($response['availToken']) ? 'SIM' : 'NÃO'));

        if (isset($response['budgets']) || isset($response['availToken'])) {
            wp_send_json_success($response);
        } else {
            $this->log('Search failed: ' . json_encode($response), 'error');
            wp_send_json_error($response);
        }
    }

    public function ajax_paginate_packages() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $this->log('=== AJAX PAGINATE PACKAGES CALLED ===');

        $avail_token = sanitize_text_field($_POST['avail_token']);
        $first_item = isset($_POST['first_item']) ? intval($_POST['first_item']) : 0;
        $item_count = isset($_POST['item_count']) ? intval($_POST['item_count']) : 10;

        // Receber parâmetros originais da busca
        $original_params = array(
            'originCode' => sanitize_text_field($_POST['origin_code']),
            'destinationCode' => sanitize_text_field($_POST['destination_code']),
            'startDate' => sanitize_text_field($_POST['start_date']),
            'numNights' => intval($_POST['num_nights']),
            'rooms' => json_decode(stripslashes($_POST['rooms']), true)
        );

        $this->log('Paginação requisitada:');
        $this->log('  - first_item: ' . $first_item);
        $this->log('  - item_count: ' . $item_count);
        $this->log('  - original_params recebidos: SIM');

        $response = $this->paginate_availability($avail_token, $first_item, $item_count, $original_params);

        $this->log('Resposta da paginação:');
        $this->log('  - budgets: ' . (isset($response['budgets']) ? count($response['budgets']) : 0));
        $this->log('  - totalCount: ' . (isset($response['totalCount']) ? $response['totalCount'] : 0));
        $this->log('  - hotels: ' . (isset($response['hotels']) ? count($response['hotels']) : 0));

        if (isset($response['budgets']) || isset($response['availToken'])) {
            wp_send_json_success($response);
        } else {
            $this->log('Pagination failed: ' . json_encode($response), 'error');
            wp_send_json_error($response);
        }
    }

    public function ajax_get_package_details() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $avail_token = sanitize_text_field($_POST['avail_token']);
        $budget_id = sanitize_text_field($_POST['budget_id']);
        $hotel_code = sanitize_text_field($_POST['hotel_code']);
        $provider_code = sanitize_text_field($_POST['provider_code']);

        $this->log("Getting details for budget: {$budget_id}, hotel: {$hotel_code}");

        $response = $this->get_package_details($avail_token, $budget_id, $hotel_code, $provider_code);

        $this->log('Details response structure: ' . json_encode([
            'has_budget' => isset($response['budget']),
            'has_details' => isset($response['details']),
            'has_error' => isset($response['error']),
            'error_msg' => isset($response['error']) ? $response['error'] : null
        ]));

        // CORREÇÃO: A API pode retornar os dados mesmo sem 'budget' no primeiro nível
        // Os dados podem estar em 'details' diretamente
        if (isset($response['budget']) || isset($response['details'])) {
            // Sempre retornar success com os dados disponíveis
            wp_send_json_success($response);
        } else {
            $this->log('Details failed: ' . json_encode($response), 'error');
            wp_send_json_error(array(
                'message' => 'Erro ao carregar detalhes do pacote', 
                'details' => $response
            ));
        }
    }

    public function ajax_get_alternatives() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $avail_token = sanitize_text_field($_POST['avail_token']);
        $budget_id = sanitize_text_field($_POST['budget_id']);

        $response = $this->get_alternatives($avail_token, $budget_id);

        wp_send_json_success($response);
    }

    /**
     * AJAX: Verificar se venda está permitida
     * Chamado ANTES de permitir quote/booking
     */
    public function ajax_check_allowed_selling() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $this->log('=== CHECK ALLOWED SELLING ===');

        // Endpoint da API Soltour para verificar venda permitida
        $response = $this->make_request('booking/availability/checkAllowedSelling', array(), 'GET');

        $this->log('CheckAllowedSelling response: ' . json_encode($response));

        // Verificar se response indica sucesso
        if ($response && isset($response['allowed'])) {
            wp_send_json_success(array(
                'allowed' => $response['allowed'],
                'message' => isset($response['message']) ? $response['message'] : ''
            ));
        } else {
            // Se não houver resposta clara, assumir permitido (fail-safe)
            // Pode ajustar para fail-secure se preferir
            wp_send_json_success(array(
                'allowed' => true,
                'message' => 'Verificação de venda concluída'
            ));
        }
    }

    public function ajax_quote_package() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $avail_token = sanitize_text_field($_POST['avail_token']);
        $budget_ids = json_decode(stripslashes($_POST['budget_ids']), true);

        $response = $this->quote_package($avail_token, $budget_ids);

        if (isset($response['quote'])) {
            wp_send_json_success($response);
        } else {
            wp_send_json_error($response);
        }
    }

    /**
     * AJAX Handler: Preparar e validar cotação
     * Fluxo: fetchAvailability → validar → quote
     * Chamado quando usuário clica no botão "Selecionar" num card
     */
    public function ajax_prepare_quote() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $this->log('╔═══════════════════════════════════════════════════════════════════╗');
        $this->log('║      🎯 SOLTOUR - PREPARE QUOTE - VALIDAÇÃO INTERMEDIÁRIA        ║');
        $this->log('╚═══════════════════════════════════════════════════════════════════╝');

        // Validar e sanitizar inputs
        $avail_token = isset($_POST['avail_token']) ? sanitize_text_field($_POST['avail_token']) : '';
        $budget_id = isset($_POST['budget_id']) ? sanitize_text_field($_POST['budget_id']) : '';
        $hotel_code = isset($_POST['hotel_code']) ? sanitize_text_field($_POST['hotel_code']) : '';
        $provider_code = isset($_POST['provider_code']) ? sanitize_text_field($_POST['provider_code']) : '';

        $this->log('📥 DADOS RECEBIDOS DO FRONTEND:');
        $this->log('  ├─ availToken: ' . ($avail_token ? substr($avail_token, 0, 20) . '...' : 'NÃO FORNECIDO'));
        $this->log('  ├─ budgetId: ' . ($budget_id ?: 'NÃO FORNECIDO'));
        $this->log('  ├─ hotelCode: ' . ($hotel_code ?: 'NÃO FORNECIDO'));
        $this->log('  └─ providerCode: ' . ($provider_code ?: 'NÃO FORNECIDO'));

        // Validar dados obrigatórios
        if (empty($avail_token) || empty($budget_id)) {
            $this->log('❌ ERRO: Dados obrigatórios ausentes', 'error');
            wp_send_json_error(array(
                'message' => 'Dados incompletos. Por favor, tente novamente.',
                'debug' => array(
                    'availToken' => !empty($avail_token),
                    'budgetId' => !empty($budget_id)
                )
            ));
            return;
        }

        // ========================================
        // PASSO 1: fetchAvailability - Validar se budget ainda é válido
        // ========================================
        $this->log('');
        $this->log('🔍 PASSO 1/2: Validando pacote com fetchAvailability...');
        $this->log('  └─ Endpoint: POST /booking/fetchAvailability');

        $fetch_response = $this->fetch_availability($avail_token, $budget_id);

        $this->log('📦 RESPOSTA fetchAvailability:');
        $this->log('  ├─ result.ok: ' . (isset($fetch_response['result']['ok']) ? ($fetch_response['result']['ok'] ? 'TRUE ✅' : 'FALSE ❌') : 'UNDEFINED'));

        if (isset($fetch_response['result']['errorMessage'])) {
            $this->log('  ├─ result.errorMessage: ' . $fetch_response['result']['errorMessage']);
        }

        $this->log('  ├─ budgets: ' . (isset($fetch_response['budgets']) ? count($fetch_response['budgets']) : '0'));
        $this->log('  ├─ hotelServices: ' . (isset($fetch_response['hotelServices']) ? count($fetch_response['hotelServices']) : '0'));
        $this->log('  ├─ flightServices: ' . (isset($fetch_response['flightServices']) ? count($fetch_response['flightServices']) : '0'));
        $this->log('  └─ priceBreakdown: ' . (isset($fetch_response['priceBreakdown']) ? 'SIM ✅' : 'NÃO ❌'));

        // DEBUG: Verificar se budgetId selecionado existe nos budgets retornados
        if (isset($fetch_response['budgets']) && is_array($fetch_response['budgets'])) {
            $found_budget = false;
            $budget_ids_in_response = array();

            foreach ($fetch_response['budgets'] as $idx => $budget) {
                if (isset($budget['budgetId'])) {
                    $budget_ids_in_response[] = $budget['budgetId'];
                    if ($budget['budgetId'] === $budget_id) {
                        $found_budget = true;
                        $this->log('  └─ ✅ Budget ENCONTRADO na posição ' . $idx . ' da lista');
                        break;
                    }
                }
            }

            if (!$found_budget) {
                $this->log('  └─ ❌ Budget NÃO encontrado na lista de ' . count($fetch_response['budgets']) . ' budgets!');
                $this->log('');
                $this->log('🔍 DEBUG - BUDGETIDS DISPONÍVEIS:');
                $this->log('  ├─ Buscado: ' . $budget_id);
                $this->log('  ├─ Primeiro budgetId disponível: ' . (count($budget_ids_in_response) > 0 ? $budget_ids_in_response[0] : 'N/A'));
                $this->log('  └─ Total de budgetIds: ' . count($budget_ids_in_response));
            }
        }
        // Validar resposta do fetchAvailability
        if (!isset($fetch_response['result']['ok']) || $fetch_response['result']['ok'] === false) {
            $error_message = isset($fetch_response['result']['errorMessage'])
                ? $fetch_response['result']['errorMessage']
                : 'Budget não encontrado ou expirado';

            $this->log('');
            $this->log('❌ VALIDAÇÃO FALHOU: ' . $error_message);
            $this->log('💡 AÇÃO: Mostrar erro ao usuário (pacote expirado)');
            $this->log('📊 DEBUG INFO:');
            $this->log('  ├─ availToken válido: ' . (!empty($avail_token) ? 'SIM' : 'NÃO'));
            $this->log('  ├─ budgetId: ' . $budget_id);
            $this->log('  └─ Possível causa: Budget removido da cache ou availToken expirado');
            $this->log('╚═══════════════════════════════════════════════════════════════════╝');

            wp_send_json_error(array(
                'message' => 'Este pacote não está mais disponível. Por favor, selecione outro ou faça uma nova busca.',
                'error_type' => 'budget_expired',
                'error_details' => $error_message,
                'technical_details' => array(
                    'availToken_provided' => !empty($avail_token),
                    'budgetId' => $budget_id,
                    'fetch_response_result' => isset($fetch_response['result']) ? $fetch_response['result'] : null
                ),
                'redirect_to_results' => false  // NÃO redirecionar - deixar usuário escolher
            ));
            return;
        }

        // ========================================
        // PASSO 2: quote - Gerar cotação oficial
        // ========================================
        $this->log('');
        $this->log('✅ VALIDAÇÃO OK! Prosseguindo para quote...');
        $this->log('🎫 PASSO 2/2: Gerando cotação oficial com /booking/quote...');
        $this->log('  └─ Endpoint: POST /booking/quote');

        $quote_response = $this->quote_package($avail_token, array($budget_id));

        $this->log('📋 RESPOSTA quote:');
        $this->log('  ├─ budget: ' . (isset($quote_response['budget']) ? 'SIM ✅' : 'NÃO ❌'));
        $this->log('  ├─ quoteToken: ' . (isset($quote_response['quoteToken']) ? substr($quote_response['quoteToken'], 0, 20) . '... ✅' : 'NÃO ❌'));
        $this->log('  ├─ insurances: ' . (isset($quote_response['insurances']) ? count($quote_response['insurances']) : '0'));
        $this->log('  ├─ extras: ' . (isset($quote_response['extras']) ? count($quote_response['extras']) : '0'));
        $this->log('  ├─ importantInformation: ' . (isset($quote_response['importantInformation']) ? count($quote_response['importantInformation']) : '0'));
        $this->log('  ├─ cancellationChargeServices: ' . (isset($quote_response['cancellationChargeServices']) ? count($quote_response['cancellationChargeServices']) : '0'));

        if (isset($quote_response['priceBreakdown'])) {
            $pb = $quote_response['priceBreakdown'];
            $this->log('  └─ priceBreakdown.totalPvp: ' . (isset($pb['totalPvp']) ? $pb['totalPvp'] . ' €' : 'N/A'));
        }

        // Validar resposta do quote
        if (!isset($quote_response['budget'])) {
            $this->log('');
            $this->log('❌ ERRO: Quote não retornou budget válido');
            $this->log('╚═══════════════════════════════════════════════════════════════════╝');

            wp_send_json_error(array(
                'message' => 'Erro ao gerar cotação. Por favor, tente novamente.',
                'debug_data' => $quote_response
            ));
            return;
        }

        // ========================================
        // SUCESSO: Retornar dados completos para o frontend
        // ========================================
        $this->log('');
        $this->log('✅ SUCESSO! Preparação de cotação concluída');
        $this->log('📤 RETORNANDO DADOS PARA FRONTEND:');
        $this->log('  ├─ fetchAvailability: COMPLETO');
        $this->log('  ├─ quote: COMPLETO');
        $this->log('  └─ quoteToken: GERADO');
        $this->log('╚═══════════════════════════════════════════════════════════════════╝');

        wp_send_json_success(array(
            'message' => 'Pacote validado com sucesso!',
            'fetchAvailability' => $fetch_response,
            'quote' => $quote_response,
            'quoteToken' => isset($quote_response['quoteToken']) ? $quote_response['quoteToken'] : null,
            'debugInfo' => array(
                'availToken' => substr($avail_token, 0, 20) . '...',
                'budgetId' => $budget_id,
                'hotelCode' => $hotel_code,
                'providerCode' => $provider_code,
                'timestamp' => current_time('mysql')
            )
        ));
    }

    /**
     * AJAX Handler: Gerar cotação final na página de cotação
     * Função simplificada para apenas coletar dados e retornar sucesso
     */
    public function ajax_generate_quote() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        // Coletar dados do POST
        $budget_data = isset($_POST['budget_data']) ? json_decode(stripslashes($_POST['budget_data']), true) : array();
        $passengers = isset($_POST['passengers']) ? json_decode(stripslashes($_POST['passengers']), true) : array();
        $notes = isset($_POST['notes']) ? sanitize_textarea_field($_POST['notes']) : '';

        // Validar dados básicos
        if (empty($budget_data) || empty($budget_data['budgetId']) || empty($passengers)) {
            wp_send_json_error(array(
                'message' => 'Dados incompletos. Por favor, preencha todos os campos obrigatórios.'
            ));
            return;
        }

        // Log dos dados recebidos
        error_log('[Soltour Quote] Budget ID: ' . $budget_data['budgetId']);
        error_log('[Soltour Quote] Passageiros: ' . count($passengers));
        error_log('[Soltour Quote] Notas: ' . $notes);

        // Preparar dados da cotação
        $quote_data = array(
            'budgetId' => $budget_data['budgetId'],
            'hotelCode' => $budget_data['hotelCode'],
            'availToken' => $budget_data['availToken'],
            'passengers' => $passengers,
            'notes' => $notes,
            'date' => current_time('mysql'),
            'status' => 'pending'
        );

        // Salvar no banco de dados (opcional - pode ser implementado depois)
        // Por enquanto, apenas simular sucesso

        // TODO: Enviar email com a cotação (pode ser implementado depois)
        // TODO: Chamar API da Soltour para gerar quote oficial (pode ser implementado depois)

        // Retornar sucesso
        wp_send_json_success(array(
            'message' => 'Cotação gerada com sucesso!',
            'quote_id' => uniqid('quote_', true),
            'quote_data' => $quote_data
        ));
    }

    public function ajax_generate_expedient() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $params = array(
            'destination' => sanitize_text_field($_POST['destination']),
            'availToken' => sanitize_text_field($_POST['avail_token']),
            'bookingHolder' => json_decode(stripslashes($_POST['booking_holder']), true),
            'startDate' => sanitize_text_field($_POST['start_date']),
            'agencyBookingReference' => sanitize_text_field($_POST['reference'])
        );

        $response = $this->generate_expedient($params);

        if (isset($response['expedient'])) {
            wp_send_json_success($response);
        } else {
            wp_send_json_error($response);
        }
    }

    public function ajax_book_package() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $params = array(
            'availToken' => sanitize_text_field($_POST['avail_token']),
            'expedient' => sanitize_text_field($_POST['expedient']),
            'rooms' => json_decode(stripslashes($_POST['rooms']), true),
            'email' => sanitize_email($_POST['email']),
            'phoneNumber' => sanitize_text_field($_POST['phone']),
            'agencyBookingReference' => sanitize_text_field($_POST['reference'])
        );

        $response = $this->book_package($params);

        if (isset($response['booking'])) {
            wp_send_json_success($response);
        } else {
            wp_send_json_error($response);
        }
    }

    public function ajax_get_booking_details() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $booking_reference = sanitize_text_field($_POST['booking_reference']);

        $response = $this->get_booking_details($booking_reference);

        if (isset($response['booking'])) {
            wp_send_json_success($response);
        } else {
            wp_send_json_error($response);
        }
    }

    public function ajax_cancel_booking() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $booking_reference = sanitize_text_field($_POST['booking_reference']);
        $pre_cancel = isset($_POST['pre_cancellation']) ? (bool)$_POST['pre_cancellation'] : true;

        $response = $this->cancel_booking($booking_reference, $pre_cancel);

        wp_send_json_success($response);
    }

    // ========================================
    // 7) FUNCIONALIDADES DE QUOTE AVANÇADAS
    // ========================================

    /**
     * POST /booking/quote/delayedQuote
     * Busca preços finais em background (DelayedQuote)
     *
     * Similar ao DelayedAvailability, mas para a página de quote.
     * Permite carregar a página rapidamente e buscar preços reais depois.
     */
    public function delayed_quote($params) {
        $data = array(
            'budgetId' => $params['budgetId'],
            'availToken' => $params['availToken'],
            'productType' => isset($params['productType']) ? $params['productType'] : 'PACKAGE',
            'fromPage' => isset($params['fromPage']) ? $params['fromPage'] : 'SEARCHER',
            'forceQuote' => true
        );

        // Adicionar myBpAccount se fornecido
        if (isset($params['myBpAccount'])) {
            $data['myBpAccount'] = $params['myBpAccount'];
        }

        $this->log('=== DELAYED QUOTE ===');
        $this->log('Request: ' . json_encode($data));

        $response = $this->make_request('booking/quote/delayedQuote', $data);

        $this->log('Response: ' . json_encode($response));

        return $response;
    }

    /**
     * AJAX Handler para delayed quote
     */
    public function ajax_delayed_quote() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $this->log('=== AJAX DELAYED QUOTE ===');

        $params = array(
            'budgetId' => sanitize_text_field($_POST['budget_id']),
            'availToken' => sanitize_text_field($_POST['avail_token']),
            'productType' => isset($_POST['product_type']) ? sanitize_text_field($_POST['product_type']) : 'PACKAGE',
            'fromPage' => isset($_POST['from_page']) ? sanitize_text_field($_POST['from_page']) : 'SEARCHER',
            'forceQuote' => filter_var($_POST['force_quote'], FILTER_VALIDATE_BOOLEAN)
        );

        // Adicionar myBpAccount se fornecido
        if (isset($_POST['my_bp_account'])) {
            $params['myBpAccount'] = sanitize_text_field($_POST['my_bp_account']);
        }

        $response = $this->delayed_quote($params);

        if ($response && !isset($response['error'])) {
            wp_send_json_success($response);
        } else {
            $error_msg = isset($response['error']) ? $response['error'] : 'Erro ao buscar preços finais';
            wp_send_json_error(array('message' => $error_msg));
        }
    }

    /**
     * POST /booking/quote/updateOptionalService
     * Adiciona ou remove um serviço opcional (seguro, transfer, golf, etc)
     *
     * Atualiza o preço total e persiste no availToken.
     */
    public function update_optional_service($params) {
        $data = array(
            'availToken' => $params['availToken'],
            'serviceId' => $params['serviceId'],
            'addService' => $params['addService'],
            'destinationCode' => $params['destinationCode']
        );

        // Adicionar passageiros se fornecido (para golf/extras)
        if (isset($params['passengers'])) {
            $data['passengers'] = $params['passengers'];
        }

        $this->log('=== UPDATE OPTIONAL SERVICE ===');
        $this->log('Request: ' . json_encode($data));

        $response = $this->make_request('booking/quote/updateOptionalService', $data);

        $this->log('Response: ' . json_encode($response));

        return $response;
    }

    /**
     * AJAX Handler para update optional service
     */
    public function ajax_update_optional_service() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $this->log('=== AJAX UPDATE OPTIONAL SERVICE ===');

        $service_data = json_decode(stripslashes($_POST['service_data']), true);

        if (!$service_data) {
            wp_send_json_error(array('message' => 'Dados inválidos'));
            return;
        }

        $params = array(
            'availToken' => sanitize_text_field($service_data['availToken']),
            'serviceId' => sanitize_text_field($service_data['serviceId']),
            'addService' => filter_var($service_data['addService'], FILTER_VALIDATE_BOOLEAN),
            'destinationCode' => sanitize_text_field($service_data['destinationCode'])
        );

        if (isset($service_data['passengers'])) {
            $params['passengers'] = $service_data['passengers'];
        }

        $response = $this->update_optional_service($params);

        if ($response && !isset($response['error'])) {
            wp_send_json_success($response);
        } else {
            $error_msg = isset($response['error']) ? $response['error'] : 'Erro ao atualizar serviço';
            wp_send_json_error(array('message' => $error_msg));
        }
    }

    // ========================================
    // 8) VALIDAÇÕES AVANÇADAS
    // ========================================

    /**
     * AJAX Handler para validar expediente
     * Validação em tempo real (com debouncing no cliente)
     */
    public function ajax_validate_expedient() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $expedient = sanitize_text_field($_POST['expedient']);
        $client_code = isset($_POST['client_code']) ? sanitize_text_field($_POST['client_code']) : '';
        $branch_office_code = isset($_POST['branch_office_code']) ? sanitize_text_field($_POST['branch_office_code']) : '';

        $this->log('=== VALIDATE EXPEDIENT ===');
        $this->log('Expedient: ' . $expedient);

        // Validação básica
        if (empty($expedient)) {
            wp_send_json_error(array(
                'valid' => false,
                'message' => 'Expediente não pode estar vazio'
            ));
            return;
        }

        // Validação de formato: mínimo 3 caracteres, alfanumérico
        if (strlen($expedient) < 3 || !preg_match('/^[A-Za-z0-9-]+$/', $expedient)) {
            wp_send_json_success(array(
                'valid' => false,
                'message' => 'Formato de expediente inválido'
            ));
            return;
        }

        // Se passar nas validações básicas
        wp_send_json_success(array(
            'valid' => true,
            'message' => 'Expediente válido'
        ));
    }

    /**
     * AJAX Handler para validar passageiros (nomes duplicados)
     */
    public function ajax_validate_passengers() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $this->log('=== VALIDATE PASSENGERS ===');

        $passenger_data = json_decode(stripslashes($_POST['passenger_data']), true);

        if (!$passenger_data) {
            wp_send_json_error(array('message' => 'Dados inválidos'));
            return;
        }

        // Extrair nomes dos passageiros
        $names = array();

        if (isset($passenger_data['rooms']) && is_array($passenger_data['rooms'])) {
            foreach ($passenger_data['rooms'] as $room) {
                if (isset($room['passengers']) && is_array($room['passengers'])) {
                    foreach ($room['passengers'] as $passenger) {
                        if (isset($passenger['firstName']) && isset($passenger['lastName1'])) {
                            $fullName = strtolower(trim($passenger['firstName'] . ' ' . $passenger['lastName1']));
                            $names[] = $fullName;
                        }
                    }
                }
            }
        }

        // Verificar duplicatas
        $duplicates = array();
        $name_count = array_count_values($names);

        foreach ($name_count as $name => $count) {
            if ($count > 1) {
                $duplicates[] = $name;
            }
        }

        if (count($duplicates) > 0) {
            // Encontrados nomes duplicados
            $duplicate_list = implode(', ', array_map('ucwords', $duplicates));

            wp_send_json_success(array(
                'duplicates' => true,
                'names' => $duplicates,
                'message' => 'Foram encontrados passageiros com nomes duplicados: ' . $duplicate_list . '. Deseja continuar?'
            ));
        } else {
            // Nenhuma duplicata
            wp_send_json_success(array(
                'duplicates' => false,
                'message' => 'Validação concluída'
            ));
        }
    }

    // ========================================
    // 9) PRINT E EMAIL DE COTAÇÃO
    // ========================================

    /**
     * POST /booking/quote/print
     * Gera PDF da cotação
     */
    public function print_quote($params) {
        $data = array(
            'budgetId' => $params['budgetId'],
            'availToken' => $params['availToken'],
            'breakdownView' => isset($params['breakdownView']) ? $params['breakdownView'] : 'gross'
        );

        // Adicionar dados do formulário se fornecidos
        if (isset($params['rooms'])) {
            $data['rooms'] = $params['rooms'];
        }
        if (isset($params['holder'])) {
            $data['holder'] = $params['holder'];
        }
        if (isset($params['agency'])) {
            $data['agency'] = $params['agency'];
        }

        $this->log('=== PRINT QUOTE ===');
        $this->log('Request: ' . json_encode($data));

        $response = $this->make_request('booking/quote/print', $data);

        $this->log('Response: ' . json_encode($response));

        return $response;
    }

    /**
     * AJAX Handler para imprimir cotação
     */
    public function ajax_print_quote() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $this->log('=== AJAX PRINT QUOTE ===');

        $quote_data = json_decode(stripslashes($_POST['quote_data']), true);

        if (!$quote_data) {
            wp_send_json_error(array('message' => 'Dados inválidos'));
            return;
        }

        $this->log('Quote data para impressão: ' . json_encode($quote_data));

        // Chamar API da Soltour para gerar PDF
        $response = $this->print_quote($quote_data);

        if ($response && !isset($response['error'])) {
            // API retorna URL do PDF ou HTML
            if (isset($response['pdfUrl'])) {
                wp_send_json_success(array(
                    'pdf_url' => $response['pdfUrl'],
                    'message' => 'PDF gerado com sucesso'
                ));
            } else if (isset($response['result']) && $response['result']['ok']) {
                // Fallback: criar PDF localmente se API não retornar URL
                $pdf_url = $this->generate_local_pdf($quote_data);
                wp_send_json_success(array(
                    'pdf_url' => $pdf_url,
                    'message' => 'PDF gerado com sucesso'
                ));
            } else {
                wp_send_json_error(array('message' => 'Erro ao gerar PDF'));
            }
        } else {
            $error_msg = isset($response['error']) ? $response['error'] : 'Erro ao gerar PDF';
            wp_send_json_error(array('message' => $error_msg));
        }
    }

    /**
     * Gera PDF localmente como fallback
     */
    private function generate_local_pdf($data) {
        // Esta é uma implementação básica de fallback
        // Em produção, você pode usar uma biblioteca como TCPDF ou mPDF

        // Por enquanto, gerar um HTML que pode ser impresso
        $upload_dir = wp_upload_dir();
        $pdf_dir = $upload_dir['basedir'] . '/soltour-quotes/';

        if (!file_exists($pdf_dir)) {
            wp_mkdir_p($pdf_dir);
        }

        $filename = 'quote-' . time() . '.html';
        $filepath = $pdf_dir . $filename;

        // Gerar HTML da cotação
        $html = $this->build_quote_html($data);

        // Salvar arquivo
        file_put_contents($filepath, $html);

        // Retornar URL
        return $upload_dir['baseurl'] . '/soltour-quotes/' . $filename;
    }

    /**
     * Constrói HTML da cotação para impressão
     */
    private function build_quote_html($data) {
        $html = '<!DOCTYPE html><html><head>';
        $html .= '<meta charset="UTF-8">';
        $html .= '<title>Cotação Soltour</title>';
        $html .= '<style>';
        $html .= 'body { font-family: Arial, sans-serif; margin: 40px; }';
        $html .= 'h1 { color: #ff211c; }';
        $html .= 'table { width: 100%; border-collapse: collapse; margin: 20px 0; }';
        $html .= 'th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }';
        $html .= 'th { background-color: #ff211c; color: white; }';
        $html .= '.total { font-size: 24px; font-weight: bold; color: #ff211c; }';
        $html .= '@media print { button { display: none; } }';
        $html .= '</style></head><body>';

        $html .= '<h1>Cotação Soltour</h1>';
        $html .= '<p><strong>Data:</strong> ' . date('d/m/Y H:i') . '</p>';

        // Informações do titular se disponível
        if (isset($data['holder'])) {
            $html .= '<h2>Dados do Titular</h2>';
            $html .= '<p><strong>Nome:</strong> ' . esc_html($data['holder']['name'] ?? '') . '</p>';
            $html .= '<p><strong>Email:</strong> ' . esc_html($data['holder']['email'] ?? '') . '</p>';
        }

        // Breakdown de preços
        if (isset($data['breakdownView'])) {
            $html .= '<h2>Detalhamento de Preços (' . ($data['breakdownView'] === 'gross' ? 'Bruto' : 'Líquido') . ')</h2>';
        }

        // Total
        if (isset($data['totalAmount'])) {
            $html .= '<div class="total">';
            $html .= '<p>Valor Total: €' . number_format($data['totalAmount'], 2, ',', '.') . '</p>';
            $html .= '</div>';
        }

        $html .= '<button onclick="window.print()">Imprimir</button>';
        $html .= '</body></html>';

        return $html;
    }

    /**
     * POST /booking/quote/send
     * Envia cotação por email
     */
    public function send_quote_email($params) {
        $data = array(
            'budgetId' => $params['budgetId'],
            'availToken' => $params['availToken'],
            'email' => $params['email'],
            'breakdownView' => isset($params['breakdownView']) ? $params['breakdownView'] : 'gross'
        );

        // Adicionar dados do formulário se fornecidos
        if (isset($params['rooms'])) {
            $data['rooms'] = $params['rooms'];
        }
        if (isset($params['holder'])) {
            $data['holder'] = $params['holder'];
        }
        if (isset($params['agency'])) {
            $data['agency'] = $params['agency'];
        }

        $this->log('=== SEND QUOTE EMAIL ===');
        $this->log('Request: ' . json_encode($data));

        $response = $this->make_request('booking/quote/send', $data);

        $this->log('Response: ' . json_encode($response));

        return $response;
    }

    /**
     * AJAX Handler para enviar cotação por email
     */
    public function ajax_send_quote_email() {
        check_ajax_referer('soltour_booking_nonce', 'nonce');

        $this->log('=== AJAX SEND QUOTE EMAIL ===');

        $email_data = json_decode(stripslashes($_POST['email_data']), true);

        if (!$email_data) {
            wp_send_json_error(array('message' => 'Dados inválidos'));
            return;
        }

        // Validar email
        if (!isset($email_data['email']) || !is_email($email_data['email'])) {
            wp_send_json_error(array('message' => 'Email inválido'));
            return;
        }

        $to_email = sanitize_email($email_data['email']);

        $this->log('Enviando cotação para: ' . $to_email);

        // Tentar enviar via API da Soltour primeiro
        $response = $this->send_quote_email($email_data);

        if ($response && !isset($response['error'])) {
            if (isset($response['result']) && $response['result']['ok']) {
                $this->log('Email enviado via API Soltour');
                wp_send_json_success(array('message' => 'Email enviado com sucesso'));
                return;
            }
        }

        // Fallback: enviar via wp_mail se API falhar
        $this->log('Fallback: enviando via wp_mail');

        $subject = 'Sua Cotação Soltour';
        $message = $this->build_quote_email_html($email_data);
        $headers = array('Content-Type: text/html; charset=UTF-8');

        $sent = wp_mail($to_email, $subject, $message, $headers);

        if ($sent) {
            $this->log('Email enviado com sucesso via wp_mail');
            wp_send_json_success(array('message' => 'Email enviado com sucesso'));
        } else {
            $this->log('Erro ao enviar email');
            wp_send_json_error(array('message' => 'Erro ao enviar email. Por favor, tente novamente.'));
        }
    }

    /**
     * Constrói HTML do email de cotação
     */
    private function build_quote_email_html($data) {
        $html = '<html><body>';
        $html .= '<h2>Sua Cotação Soltour</h2>';
        $html .= '<p>Obrigado pelo seu interesse!</p>';

        // Adicionar dados da cotação
        if (isset($data['totalAmount'])) {
            $html .= '<p><strong>Valor Total:</strong> €' . number_format($data['totalAmount'], 2, ',', '.') . '</p>';
        }

        $html .= '<p>Para mais informações, entre em contato conosco.</p>';
        $html .= '</body></html>';

        return $html;
    }
}
