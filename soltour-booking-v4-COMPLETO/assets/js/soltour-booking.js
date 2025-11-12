/**
 * Soltour Booking V4 - JavaScript COMPLETO
 * COM TODOS OS CAMPOS MAPEADOS CORRETAMENTE
 */

(function($) {
    'use strict';

    // MAPEAMENTOS DE DESTINOS E ORIGENS
    const DESTINATIONS_MAP = {
        'PUJ': { country: 'República Dominicana', city: 'Punta Cana' },
        'SDQ': { country: 'República Dominicana', city: 'Santo Domingo' },
        'STI': { country: 'República Dominicana', city: 'Santiago' },
        'LRM': { country: 'República Dominicana', city: 'La Romana' },
        'AUA': { country: 'Aruba', city: 'Oranjestad' },
        'CUN': { country: 'México', city: 'Cancún' },
        'CZM': { country: 'México', city: 'Cozumel' },
        'VRA': { country: 'Cuba', city: 'Varadero' },
        'HAV': { country: 'Cuba', city: 'Havana' },
        'MBJ': { country: 'Jamaica', city: 'Montego Bay' }
    };

    const ORIGINS_MAP = {
        'LIS': 'Lisboa',
        'OPO': 'Porto',
        'FAO': 'Faro',
        'MAD': 'Madrid',
        'BCN': 'Barcelona',
        'SVQ': 'Sevilha',
        'BIO': 'Bilbau',
        'VLC': 'Valência'
    };

    window.SoltourApp = {
        availToken: null,
        budgetId: null,
        hotelCode: null,
        providerCode: null,
        expedient: null,
        searchParams: {},
        selectedPackage: null,
        state: 0, // Contador de estado para tracking no URL
        currentMonth: new Date().getMonth() + 1,
        currentYear: new Date().getFullYear(),
        currentPage: 1,
        itemsPerPage: 10,
        totalBudgets: 0,
        allBudgets: [],
        enrichedPackages: {},
        uniqueHotels: [],
        allUniqueHotels: [], // TODOS os hotéis únicos deduplicados (para paginação local)
        originalHotels: [], // Cópia dos hotéis originais sem filtros (para poder resetar filtros)
        hotelsFromAvailability: {},
        minDate: null,
        maxDate: null,
        // Filtros
        filters: {
            sortBy: 'price-asc', // 'price-asc', 'price-desc', 'stars-desc'
            minPrice: 0, // Preço mínimo absoluto dos dados
            maxPrice: 10000,
            absoluteMaxPrice: 10000, // Preço máximo absoluto dos dados (para saber se filtro está ativo)
            selectedStars: [] // Array de estrelas selecionadas [3, 4, 5]
        }
    };

    function log(message, data) {
        console.log('%c[Soltour] ' + message, 'color: #0073aa; font-weight: bold', data || '');
    }

    function logSuccess(message, data) {
        console.log('%c[Soltour ✓] ' + message, 'color: #4caf50; font-weight: bold', data || '');
    }

    function logError(message, error) {
        console.error('%c[Soltour ✗] ' + message, 'color: #f44336; font-weight: bold', error || '');
    }

    // ========================================
    // FUNÇÕES DO MODAL DE CARREGAMENTO
    // ========================================

    /**
     * Mostra o modal de carregamento com mensagem personalizada
     * @param {string} title - Título do modal (opcional)
     * @param {string} message - Mensagem do modal (opcional)
     */
    function showLoadingModal(title, message) {
        const modal = $('#soltour-loading-modal');

        if (modal.length) {
            // Atualizar textos se fornecidos
            if (title) {
                $('#loading-modal-title').text(title);
            }
            if (message) {
                $('#loading-modal-message').text(message);
            }

            // Mostrar modal com animação
            modal.addClass('active');

            // Prevenir scroll do body
            $('body').css('overflow', 'hidden');

            log('Modal de carregamento exibido', { title, message });
        }
    }

    /**
     * Esconde o modal de carregamento
     */
    function hideLoadingModal() {
        const modal = $('#soltour-loading-modal');

        if (modal.length) {
            // Remover classe active para esconder
            modal.removeClass('active');

            // Restaurar scroll do body
            $('body').css('overflow', '');

            log('Modal de carregamento escondido');
        }
    }

    /**
     * Atualiza a mensagem do modal sem esconder
     * @param {string} title - Novo título
     * @param {string} message - Nova mensagem
     */
    function updateLoadingModal(title, message) {
        if (title) {
            $('#loading-modal-title').text(title);
        }
        if (message) {
            $('#loading-modal-message').text(message);
        }
    }

    // ========================================
    // STATE TRACKING E URL MANAGEMENT
    // ========================================

    /**
     * Atualiza a URL com availToken e state tracking
     * Permite manter estado após reload da página
     * @param {string} availToken - Token de disponibilidade da API
     */
    function updateURLState(availToken) {
        if (!availToken) {
            logError('updateURLState chamado sem availToken');
            return;
        }

        // Incrementar contador de estado
        SoltourApp.state++;

        // Atualizar URL sem reload
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('availToken', availToken);
        newUrl.searchParams.set('state', SoltourApp.state);

        window.history.replaceState({}, '', newUrl);

        log(`📍 URL atualizado: state=${SoltourApp.state}, availToken=${availToken.substring(0, 15)}...`);
    }

    /**
     * Restaura estado da URL ao carregar página
     * Usado quando usuário dá reload ou volta para resultados
     */
    function restoreStateFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const availToken = urlParams.get('availToken');
        const state = parseInt(urlParams.get('state') || '0');

        if (availToken && state > 0) {
            SoltourApp.availToken = availToken;
            SoltourApp.state = state;
            log(`🔄 Estado restaurado da URL: state=${state}, availToken=${availToken.substring(0, 15)}...`);
            return true;
        }

        return false;
    }

    $(document).ready(function() {
        log('Plugin V4 inicializado - COMPLETO');
        initSearchForm();
        initResultsPage();
    });

    function initSearchForm() {
        if ($('#soltour-search-form').length === 0) return;

        // Verificar se há mensagem de "sem resultados" no localStorage
        const noResultsMessage = localStorage.getItem('soltour_no_results_message');
        if (noResultsMessage) {
            // Mostrar mensagem de alerta
            const alertHtml = `
                <div class="soltour-alert soltour-alert-warning" style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 20px; color: #856404;">
                    <div style="display: flex; align-items: start; gap: 15px;">
                        <div style="font-size: 32px;">⚠️</div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700;">Nenhum pacote encontrado</h4>
                            <p style="margin: 0; line-height: 1.6;">${noResultsMessage}</p>
                        </div>
                        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #856404; padding: 0; line-height: 1;">×</button>
                    </div>
                </div>
            `;
            $('.soltour-search-wrapper').prepend(alertHtml);

            // Limpar mensagem do localStorage
            localStorage.removeItem('soltour_no_results_message');
        }

        loadDestinations();
        
        $('#soltour-destination').on('change', function() {
            const destCode = $(this).val();
            if (destCode) {
                loadOrigins(destCode);
                SoltourApp.searchParams.destinationCode = destCode;
            }
        });

        $('#soltour-origin').on('change', function() {
            SoltourApp.searchParams.originCode = $(this).val();
        });

        $('#soltour-nights').on('change', function() {
            SoltourApp.searchParams.numNights = $(this).val();
        });

        $('#soltour-children').on('change', function() {
            const numChildren = parseInt($(this).val());
            if (numChildren > 0) {
                showChildrenAges(numChildren);
            } else {
                $('#soltour-children-ages').hide();
            }
        });

        $('#soltour-search-form').on('submit', function(e) {
            e.preventDefault();
            performSearch();
        });
    }

    function loadDestinations() {
        $.ajax({
            url: soltourData.ajaxurl,
            type: 'POST',
            data: {
                action: 'soltour_get_destinations',
                nonce: soltourData.nonce
            },
            success: function(response) {
                if (response.success) {
                    const $select = $('#soltour-destination');
                    $select.empty().append('<option value="">Selecione um destino</option>');
                    response.data.forEach(function(dest) {
                        $select.append(`<option value="${dest.code}">${dest.displayName}</option>`);
                    });
                }
            }
        });
    }

    function loadOrigins(destinationCode) {
        $('#soltour-origin').html('<option value="">A carregar...</option>');
        
        $.ajax({
            url: soltourData.ajaxurl,
            type: 'POST',
            data: {
                action: 'soltour_get_origins',
                nonce: soltourData.nonce,
                destination_code: destinationCode
            },
            success: function(response) {
                const $select = $('#soltour-origin');
                $select.empty().append('<option value="">Selecione a origem</option>');
                if (response.success) {
                    response.data.forEach(function(origin) {
                        $select.append(`<option value="${origin.code}">${origin.description}</option>`);
                    });
                }
            }
        });
    }

    function showChildrenAges(numChildren) {
        const $container = $('#soltour-children-ages-inputs');
        $container.empty();
        for (let i = 0; i < numChildren; i++) {
            $container.append(`
                <div class="child-age-input">
                    <label>Idade criança ${i + 1}:</label>
                    <select name="child_age_${i}" required>
                        ${Array.from({length: 18}, (_, j) => `<option value="${j}">${j}</option>`).join('')}
                    </select>
                </div>
            `);
        }
        $('#soltour-children-ages').show();
    }

    function performSearch() {
        const startDate = $('#soltour-start-date').val();
        const nights = parseInt($('#soltour-nights').val());
        const adults = parseInt($('#soltour-adults').val());
        const children = parseInt($('#soltour-children').val());

        if (!startDate || !SoltourApp.searchParams.originCode || !SoltourApp.searchParams.destinationCode) {
            alert('Preencha todos os campos');
            return;
        }

        const passengers = [];
        for (let i = 0; i < adults; i++) {
            passengers.push({ type: 'ADULT', age: 30 });
        }
        for (let i = 0; i < children; i++) {
            const age = parseInt($(`select[name="child_age_${i}"]`).val()) || 10;
            passengers.push({ type: 'CHILD', age: age });
        }

        // Resetar para primeira página na nova busca
        SoltourApp.currentPage = 1;

        // Determinar tipo de produto baseado se tem origem ou não
        const hasOrigin = !!SoltourApp.searchParams.originCode;
        const onlyHotel = hasOrigin ? "N" : "S";
        const productType = onlyHotel === "S" ? "HOTEL_PRODUCT" : "PACKAGE";

        SoltourApp.searchParams = {
            action: 'soltour_search_packages',
            nonce: soltourData.nonce,
            origin_code: SoltourApp.searchParams.originCode,
            destination_code: SoltourApp.searchParams.destinationCode,
            start_date: startDate,
            num_nights: nights,
            rooms: JSON.stringify([{ passengers: passengers }]),

            // Parâmetros críticos para API processar corretamente
            only_hotel: onlyHotel,
            product_type: productType,
            force_avail: false, // Primeira busca sempre false (rápida)

            first_item: 0,
            item_count: SoltourApp.itemsPerPage
        };

        log('Parâmetros de busca configurados:', {
            onlyHotel: onlyHotel,
            productType: productType,
            forceAvail: false,
            hasOrigin: hasOrigin
        });

        if ($('#soltour-results-list').length > 0) {
            searchPackagesAjax();
        } else {
            sessionStorage.setItem('soltour_search_params', JSON.stringify(SoltourApp.searchParams));
            window.location.href = '/pacotes-resultados/';
        }
    }

    function initResultsPage() {
        if ($('#soltour-results-list').length === 0) return;

        log('=== PÁGINA DE RESULTADOS V4 ===');
        const savedParams = sessionStorage.getItem('soltour_search_params');
        if (savedParams) {
            // MOSTRAR MODAL IMEDIATAMENTE ao carregar página de resultados
            showLoadingModal(
                'Buscando os melhores pacotes...',
                'Encontraremos as melhores opções para sua viagem'
            );

            SoltourApp.searchParams = JSON.parse(savedParams);
            searchPackagesAjax();
        }

        // Inicializar filtros
        initFilters();
    }

    // ========================================
    // FUNÇÕES DE FILTROS
    // ========================================

    function initFilters() {
        log('Inicializando filtros');

        // Filtro de ordenação
        $('#soltour-sort-by').on('change', function() {
            SoltourApp.filters.sortBy = $(this).val();
            log('Ordenação alterada para: ' + SoltourApp.filters.sortBy);
            applyFilters();
        });

        // Filtro de preço máximo
        $('#soltour-max-price').on('input', function() {
            const value = parseInt($(this).val());
            SoltourApp.filters.maxPrice = value;
            $('#soltour-max-price-value').text(value.toLocaleString('pt-PT') + '€');
        });

        $('#soltour-max-price').on('change', function() {
            log('Preço máximo alterado para: ' + SoltourApp.filters.maxPrice.toLocaleString('pt-PT') + '€');
            applyFilters();
        });

        // Filtro de estrelas
        $('.soltour-star-filter input[type="checkbox"]').on('change', function() {
            const starValue = parseInt($(this).val());

            if ($(this).is(':checked')) {
                if (!SoltourApp.filters.selectedStars.includes(starValue)) {
                    SoltourApp.filters.selectedStars.push(starValue);
                }
            } else {
                SoltourApp.filters.selectedStars = SoltourApp.filters.selectedStars.filter(s => s !== starValue);
            }

            log('Estrelas selecionadas: ' + SoltourApp.filters.selectedStars.join(', '));
            applyFilters();
        });
    }

    function applyFilters() {
        log('=== APLICANDO FILTROS ===');
        log('Filtros atuais:', SoltourApp.filters);

        // Resetar para primeira página
        SoltourApp.currentPage = 1;

        // Obter hotéis filtrados e ordenados
        const filteredHotels = getFilteredHotels();

        // Atualizar allUniqueHotels com hotéis filtrados
        SoltourApp.allUniqueHotels = filteredHotels;

        logSuccess(`${filteredHotels.length} hotéis após aplicar filtros`);

        // Atualizar state tracking (mantém estado na URL)
        if (SoltourApp.availToken) {
            updateURLState(SoltourApp.availToken);
        }

        // Se não houver resultados após filtros, mostrar mensagem inline
        if (filteredHotels.length === 0) {
            const $list = $('#soltour-results-list');
            $list.empty();
            $list.html(`
                <div style="text-align: center; padding: 60px 20px; grid-column: 1 / -1;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
                    <h3 style="color: #1a202c; font-size: 24px; margin-bottom: 12px;">Nenhum pacote corresponde aos filtros</h3>
                    <p style="color: #6b7280; font-size: 16px;">Tente ajustar os filtros para ver mais resultados</p>
                </div>
            `);
            $('#soltour-results-count').text('0 hotéis encontrados');
            $('#soltour-pagination').empty();
        } else {
            // Re-renderizar primeira página
            renderLocalPage(1);
        }
    }

    function getFilteredHotels() {
        // Filtrar a partir dos hotéis originais (sem filtros aplicados)
        let hotels = [...SoltourApp.originalHotels];

        log(`Total de hotéis antes dos filtros: ${hotels.length}`);

        // FILTRO 1: Preço máximo
        // Só aplicar filtro se o usuário ajustou o slider (maxPrice diferente do absoluto)
        if (SoltourApp.filters.maxPrice < SoltourApp.filters.absoluteMaxPrice) {
            hotels = hotels.filter(pkg => {
                const price = getHotelPrice(pkg);
                // Incluir apenas pacotes com preço <= maxPrice selecionado
                return price <= SoltourApp.filters.maxPrice;
            });
            log(`Após filtro de preço (≤ ${SoltourApp.filters.maxPrice.toLocaleString('pt-PT')}€): ${hotels.length} hotéis`);
        }

        // FILTRO 2: Estrelas selecionadas
        if (SoltourApp.filters.selectedStars.length > 0) {
            hotels = hotels.filter(pkg => {
                const hotelStars = getHotelStars(pkg);
                const isMatch = SoltourApp.filters.selectedStars.includes(hotelStars);
                return isMatch;
            });
            log(`Após filtro de estrelas (${SoltourApp.filters.selectedStars.join(', ')}): ${hotels.length} hotéis`);
        }

        // ORDENAÇÃO
        hotels.sort((a, b) => {
            if (SoltourApp.filters.sortBy === 'price-asc') {
                // Menor preço primeiro
                return getHotelPrice(a) - getHotelPrice(b);
            } else if (SoltourApp.filters.sortBy === 'price-desc') {
                // Maior preço primeiro
                return getHotelPrice(b) - getHotelPrice(a);
            } else if (SoltourApp.filters.sortBy === 'stars-desc') {
                // Mais estrelas primeiro
                return getHotelStars(b) - getHotelStars(a);
            }
            return 0;
        });

        log(`Após ordenação (${SoltourApp.filters.sortBy}): ${hotels.length} hotéis`);

        return hotels;
    }

    function getHotelPrice(pkg) {
        const budget = pkg.budget;
        if (budget.priceBreakdown && budget.priceBreakdown.priceBreakdownDetails &&
            budget.priceBreakdown.priceBreakdownDetails[0] &&
            budget.priceBreakdown.priceBreakdownDetails[0].priceInfo) {
            return budget.priceBreakdown.priceBreakdownDetails[0].priceInfo.pvp || 0;
        }
        return 0;
    }

    function getHotelStars(pkg) {
        const budget = pkg.budget;
        const hotelService = budget.hotelServices && budget.hotelServices[0];

        if (!hotelService) return 0;

        let hotelStars = 0;
        const hotelFromAvailability = SoltourApp.hotelsFromAvailability[hotelService.hotelCode];

        // Usar a MESMA lógica da renderização dos cards
        if (hotelFromAvailability && hotelFromAvailability.categoryCode) {
            hotelStars = (hotelFromAvailability.categoryCode.match(/\*/g) || []).length;
        } else if (pkg.details && pkg.details.hotelDetails && pkg.details.hotelDetails.hotel && pkg.details.hotelDetails.hotel.categoryCode) {
            hotelStars = (pkg.details.hotelDetails.hotel.categoryCode.match(/\*/g) || []).length;
        }

        return hotelStars;
    }

    function setupPriceFilter() {
        // Encontrar o preço mínimo e máximo nos resultados
        let minPrice = Infinity;
        let maxPrice = 0;

        SoltourApp.originalHotels.forEach(pkg => {
            const price = getHotelPrice(pkg);
            if (price > 0) { // Só considerar preços válidos
                if (price < minPrice) {
                    minPrice = price;
                }
                if (price > maxPrice) {
                    maxPrice = price;
                }
            }
        });

        // O slider controla o PREÇO MÁXIMO que o usuário quer pagar
        // Para garantir que sempre apareça pelo menos o pacote mais barato:
        // 1. Arredondar o menor preço para CIMA (ex: 2970.54 → 2971)
        // 2. Adicionar 10 euros (2971 + 10 = 2981)
        // Assim quando slider no mínimo (2981), filtro price <= 2981 inclui pacote de 2971
        minPrice = Math.ceil(minPrice) + 10;

        // Arredondar máximo para cima (múltiplos de 100)
        maxPrice = Math.ceil(maxPrice / 100) * 100;

        // Configurar o slider
        const $slider = $('#soltour-max-price');
        if ($slider.length) {
            $slider.attr('min', minPrice);
            $slider.attr('max', maxPrice);
            $slider.val(maxPrice);
            SoltourApp.filters.minPrice = minPrice;
            SoltourApp.filters.maxPrice = maxPrice;
            SoltourApp.filters.absoluteMaxPrice = maxPrice; // Guardar o máximo absoluto
            $('#soltour-max-price-value').text(maxPrice.toLocaleString('pt-PT') + '€');
            log(`Filtro de preço configurado: ${minPrice.toLocaleString('pt-PT')}€ - ${maxPrice.toLocaleString('pt-PT')}€`);
        }
    }

    function setupStarsFilter() {
        // Encontrar quais estrelas existem nos resultados
        const availableStars = new Set();

        SoltourApp.originalHotels.forEach(pkg => {
            const stars = getHotelStars(pkg);
            if (stars > 0) {
                availableStars.add(stars);
            }
        });

        log(`Estrelas disponíveis nos resultados: ${Array.from(availableStars).sort((a, b) => b - a).join(', ')}`);

        // Mostrar/esconder checkboxes baseado nas estrelas disponíveis
        $('.soltour-star-filter input[type="checkbox"]').each(function() {
            const starValue = parseInt($(this).val());
            const $label = $(this).parent();

            if (availableStars.has(starValue)) {
                $label.show();
            } else {
                $label.hide();
                // Desmarcar se estava marcado
                $(this).prop('checked', false);
            }
        });

        logSuccess(`Filtro de estrelas configurado - mostrando apenas: ${Array.from(availableStars).sort((a, b) => b - a).join(', ')}`);
    }

    function showSkeletonCards() {
        const $list = $('#soltour-results-list');
        $list.empty();

        // Mostrar 10 skeleton cards com barra de loading
        for (let i = 0; i < 10; i++) {
            const skeleton = `
                <div class="soltour-package-card skeleton-card">
                    <div class="package-image skeleton-shimmer">
                        <div class="skeleton-loading-bar">
                            <div class="skeleton-loading-progress"></div>
                        </div>
                    </div>
                    <div class="package-info">
                        <div class="skeleton-line skeleton-shimmer" style="width: 60%; height: 20px; margin-bottom: 12px;"></div>
                        <div class="skeleton-line skeleton-shimmer" style="width: 85%; height: 26px; margin-bottom: 12px;"></div>
                        <div class="skeleton-line skeleton-shimmer" style="width: 45%; height: 18px; margin-bottom: 16px;"></div>
                        <div class="skeleton-line skeleton-shimmer" style="width: 75%; height: 16px; margin-bottom: 10px;"></div>
                        <div class="skeleton-line skeleton-shimmer" style="width: 70%; height: 16px;"></div>
                    </div>
                    <div class="package-price">
                        <div class="skeleton-line skeleton-shimmer" style="width: 55%; height: 20px; margin-bottom: 12px;"></div>
                        <div class="skeleton-line skeleton-shimmer" style="width: 90%; height: 36px; margin-bottom: 16px;"></div>
                        <div class="skeleton-line skeleton-shimmer" style="width: 100%; height: 44px; border-radius: 12px;"></div>
                    </div>
                </div>
            `;
            $list.append(skeleton);
        }
    }

    function searchPackagesAjax() {
        log('=== BUSCA INICIADA ===');
        log('Params enviados:', SoltourApp.searchParams);

        // O modal já foi mostrado em initResultsPage(), não mostrar novamente aqui
        $('#soltour-results-loading').hide();

        // Buscar TODOS os resultados de uma vez (100 itens)
        const searchParamsWithLargeLimit = $.extend({}, SoltourApp.searchParams, {
            first_item: 0,
            item_count: 100  // Buscar 100 budgets de uma vez
        });

        $.ajax({
            url: soltourData.ajaxurl,
            type: 'POST',
            data: searchParamsWithLargeLimit,
            success: function(response) {
                $('#soltour-results-loading').hide();

                log('Resposta completa da API:', response);

                if (response.success && response.data) {
                    SoltourApp.availToken = response.data.availToken;
                    SoltourApp.allBudgets = response.data.budgets || [];
                    SoltourApp.totalBudgets = response.data.totalCount || SoltourApp.allBudgets.length;

                    // Atualizar URL com state tracking
                    updateURLState(SoltourApp.availToken);

                    log(`Total de budgets na API: ${SoltourApp.totalBudgets}`);
                    log(`Budgets recebidos: ${SoltourApp.allBudgets.length}`);

                    // Armazenar dados dos hotéis vindos do endpoint availability
                    if (response.data.hotels && Array.isArray(response.data.hotels)) {
                        SoltourApp.hotelsFromAvailability = {};
                        response.data.hotels.forEach(function(hotel) {
                            SoltourApp.hotelsFromAvailability[hotel.code] = hotel;
                        });
                        logSuccess(`${response.data.hotels.length} hotéis mapeados do availability`);
                    }

                    logSuccess(`${SoltourApp.allBudgets.length} budgets recebidos`);

                    if (SoltourApp.allBudgets.length > 0) {
                        // Deduplicar TODOS os budgets de uma vez
                        loadAllDetailsWithDeduplication(SoltourApp.allBudgets);
                    } else {
                        // Quando não há budgets, redirecionar para página de busca com mensagem
                        log('⚠️ Nenhum budget encontrado - redirecionando para busca');

                        // Salvar mensagem no localStorage
                        localStorage.setItem('soltour_no_results_message', 'Não foram encontrados pacotes para o destino selecionado com a origem escolhida. Por favor, tente outra origem ou ajuste os critérios de busca.');

                        // Redirecionar para página de busca
                        const searchPageUrl = window.location.href.replace('/pacotes-resultados', '/buscar-pacotes');
                        window.location.href = searchPageUrl;
                        return;
                    }
                } else {
                    // Quando resposta não tem success, redirecionar para busca
                    log('⚠️ Resposta sem success - redirecionando para busca');

                    localStorage.setItem('soltour_no_results_message', 'Ocorreu um erro na busca. Por favor, tente novamente com outros critérios.');

                    const searchPageUrl = window.location.href.replace('/pacotes-resultados', '/buscar-pacotes');
                    window.location.href = searchPageUrl;
                    return;
                }
            },
            error: function(xhr, status, error) {
                $('#soltour-results-loading').hide();

                // Esconder modal em caso de erro
                hideLoadingModal();

                // Mostrar mensagem de erro com toast
                if (window.SoltourApp.Toast) {
                    window.SoltourApp.Toast.error('Erro ao buscar pacotes. Por favor, tente novamente.', 5000);
                }

                // Mostrar mensagem de erro
                alert('Ocorreu um erro ao buscar os pacotes. Por favor, tente novamente.');

                logError('Erro na busca', error);
            }
        });
    }

    /**
     * Nova função: Deduplicar TODOS os budgets e armazenar todos os hotéis únicos
     * Depois fazer paginação local
     */
    function loadAllDetailsWithDeduplication(budgets) {
        log('=== DEDUPLICANDO TODOS OS BUDGETS ===');

        const uniqueBudgets = {};
        budgets.forEach(function(budget) {
            const hotelService = budget.hotelServices && budget.hotelServices[0];
            if (hotelService) {
                const hotelCode = hotelService.hotelCode;

                // Buscar o preço correto
                let price = 0;
                if (budget.priceBreakdown && budget.priceBreakdown.priceBreakdownDetails &&
                    budget.priceBreakdown.priceBreakdownDetails[0] &&
                    budget.priceBreakdown.priceBreakdownDetails[0].priceInfo) {
                    price = budget.priceBreakdown.priceBreakdownDetails[0].priceInfo.pvp || 0;
                }

                if (!uniqueBudgets[hotelCode] || price < uniqueBudgets[hotelCode].price) {
                    uniqueBudgets[hotelCode] = {
                        budget: budget,
                        price: price
                    };
                }
            }
        });

        const uniqueBudgetsList = Object.values(uniqueBudgets).map(item => item.budget);
        logSuccess(`${uniqueBudgetsList.length} hotéis únicos de ${budgets.length} budgets`);

        // Se não há hotéis únicos após deduplicação, redirecionar para página de busca
        if (uniqueBudgetsList.length === 0) {
            log('⚠️ Nenhum hotel único encontrado após deduplicação - redirecionando');

            localStorage.setItem('soltour_no_results_message', 'Não foram encontrados pacotes para o destino selecionado com a origem escolhida. Por favor, tente outra origem ou ajuste os critérios de busca.');

            const searchPageUrl = window.location.href.replace('/pacotes-resultados', '/buscar-pacotes');
            window.location.href = searchPageUrl;
            return;
        }

        let completed = 0;
        const tempEnrichedPackages = {};

        uniqueBudgetsList.forEach(function(budget) {
            const hotelService = budget.hotelServices && budget.hotelServices[0];
            if (!hotelService) {
                completed++;
                return;
            }

            const hotelCode = hotelService.hotelCode;
            const providerCode = hotelService.providerCode || 'UNDEFINED';

            $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: {
                    action: 'soltour_get_package_details',
                    nonce: soltourData.nonce,
                    avail_token: SoltourApp.availToken,
                    budget_id: budget.budgetId,
                    hotel_code: hotelCode,
                    provider_code: providerCode
                },
                success: function(response) {
                    if (response.success && response.data && response.data.hotelDetails) {
                        tempEnrichedPackages[hotelCode] = {
                            budget: budget,
                            details: response.data,
                            hotelCode: hotelCode
                        };
                    } else {
                        tempEnrichedPackages[hotelCode] = {
                            budget: budget,
                            details: null,
                            hotelCode: hotelCode
                        };
                    }

                    completed++;
                    if (completed === uniqueBudgetsList.length) {
                        // Armazenar TODOS os hotéis únicos deduplicados
                        SoltourApp.allUniqueHotels = Object.values(tempEnrichedPackages);
                        SoltourApp.originalHotels = [...SoltourApp.allUniqueHotels]; // Salvar cópia original
                        logSuccess(`${SoltourApp.allUniqueHotels.length} hotéis únicos carregados e armazenados`);

                        // Configurar filtro de preço baseado nos dados reais
                        setupPriceFilter();

                        // Configurar filtro de estrelas baseado nos dados reais
                        setupStarsFilter();

                        // Resetar para página 1
                        SoltourApp.currentPage = 1;

                        // Renderizar primeira página (paginação local)
                        renderLocalPage(1);

                        // DELAYED AVAILABILITY: Iniciar carregamento tardio de preços
                        // Se a busca inicial foi com forceAvail=false, ativar delayed loading
                        if (SoltourApp.searchParams.force_avail === false) {
                            log('🔄 Iniciando DelayedAvailability para atualizar preços...');

                            // Dar um pequeno delay para UI renderizar completamente
                            setTimeout(function() {
                                if (window.SoltourApp.DelayedAvailability) {
                                    window.SoltourApp.DelayedAvailability.init({
                                        delayedAvailActive: true
                                    });
                                } else {
                                    console.warn('⚠️  Módulo DelayedAvailability não carregado');
                                }
                            }, 500);
                        }
                    }
                },
                error: function() {
                    tempEnrichedPackages[hotelCode] = {
                        budget: budget,
                        details: null,
                        hotelCode: hotelCode
                    };
                    completed++;
                    if (completed === uniqueBudgetsList.length) {
                        // Armazenar TODOS os hotéis únicos deduplicados
                        SoltourApp.allUniqueHotels = Object.values(tempEnrichedPackages);
                        SoltourApp.originalHotels = [...SoltourApp.allUniqueHotels]; // Salvar cópia original
                        logSuccess(`${SoltourApp.allUniqueHotels.length} hotéis únicos carregados e armazenados`);

                        // Configurar filtro de preço baseado nos dados reais
                        setupPriceFilter();

                        // Configurar filtro de estrelas baseado nos dados reais
                        setupStarsFilter();

                        // Resetar para página 1
                        SoltourApp.currentPage = 1;

                        // Renderizar primeira página (paginação local)
                        renderLocalPage(1);

                        // DELAYED AVAILABILITY: Iniciar carregamento tardio de preços
                        if (SoltourApp.searchParams.force_avail === false) {
                            setTimeout(function() {
                                if (window.SoltourApp.DelayedAvailability) {
                                    window.SoltourApp.DelayedAvailability.init({
                                        delayedAvailActive: true
                                    });
                                }
                            }, 500);
                        }
                    }
                }
            });
        });
    }

    function paginatePackagesAjax(firstItem, itemCount) {
        log('=== PAGINAÇÃO INICIADA (usando availToken existente) ===');
        log(`firstItem: ${firstItem}, itemCount: ${itemCount}`);

        // Mostrar modal de carregamento durante paginação
        showLoadingModal(
            'Carregando mais pacotes...',
            'Aguarde enquanto buscamos mais opções'
        );

        showSkeletonCards();
        $('#soltour-results-loading').hide();

        $.ajax({
            url: soltourData.ajaxurl,
            type: 'POST',
            data: {
                action: 'soltour_paginate_packages',
                nonce: soltourData.nonce,
                avail_token: SoltourApp.availToken,
                first_item: firstItem,
                item_count: itemCount,
                // Enviar parâmetros originais da busca
                origin_code: SoltourApp.searchParams.origin_code,
                destination_code: SoltourApp.searchParams.destination_code,
                start_date: SoltourApp.searchParams.start_date,
                num_nights: SoltourApp.searchParams.num_nights,
                rooms: SoltourApp.searchParams.rooms
            },
            success: function(response) {
                $('#soltour-results-loading').hide();

                log('Resposta da paginação:', response);

                if (response.success && response.data) {
                    // NÃO atualizar availToken - manter o mesmo da busca inicial
                    SoltourApp.allBudgets = response.data.budgets || [];

                    // Manter o totalCount original
                    if (response.data.totalCount) {
                        SoltourApp.totalBudgets = response.data.totalCount;
                    }

                    log(`Budgets recebidos na paginação: ${SoltourApp.allBudgets.length}`);
                    log(`Total mantido: ${SoltourApp.totalBudgets}`);

                    // Atualizar mapeamento de hotéis
                    if (response.data.hotels && Array.isArray(response.data.hotels)) {
                        response.data.hotels.forEach(function(hotel) {
                            SoltourApp.hotelsFromAvailability[hotel.code] = hotel;
                        });
                        logSuccess(`${response.data.hotels.length} hotéis mapeados da paginação`);
                    }

                    if (SoltourApp.allBudgets.length > 0) {
                        loadPageDetailsWithDeduplication(SoltourApp.allBudgets);
                    } else {
                        alert('Nenhum pacote encontrado nesta página.');
                        logError('Nenhum budget retornado na paginação');
                    }
                } else {
                    logError('Erro na paginação', response);
                    alert('Erro ao carregar página de resultados.');
                }
            },
            error: function(xhr, status, error) {
                $('#soltour-results-loading').hide();
                alert('Erro ao carregar página de resultados. Por favor, tente novamente.');
                logError('Erro AJAX na paginação', error);
            }
        });
    }

    function loadPageDetailsWithDeduplication(budgets) {
        log('=== DEDUPLICANDO E CARREGANDO DETALHES ===');
        
        const uniqueBudgets = {};
        budgets.forEach(function(budget) {
            const hotelService = budget.hotelServices && budget.hotelServices[0];
            if (hotelService) {
                const hotelCode = hotelService.hotelCode;
                
                // Buscar o preço correto
                let price = 0;
                if (budget.priceBreakdown && budget.priceBreakdown.priceBreakdownDetails && 
                    budget.priceBreakdown.priceBreakdownDetails[0] && 
                    budget.priceBreakdown.priceBreakdownDetails[0].priceInfo) {
                    price = budget.priceBreakdown.priceBreakdownDetails[0].priceInfo.pvp || 0;
                }
                
                if (!uniqueBudgets[hotelCode] || price < uniqueBudgets[hotelCode].price) {
                    uniqueBudgets[hotelCode] = {
                        budget: budget,
                        price: price
                    };
                }
            }
        });

        const uniqueBudgetsList = Object.values(uniqueBudgets).map(item => item.budget);
        logSuccess(`${uniqueBudgetsList.length} hotéis únicos de ${budgets.length} budgets`);

        let completed = 0;
        SoltourApp.enrichedPackages = {};

        uniqueBudgetsList.forEach(function(budget) {
            const hotelService = budget.hotelServices && budget.hotelServices[0];
            if (!hotelService) {
                completed++;
                return;
            }

            const hotelCode = hotelService.hotelCode;
            const providerCode = hotelService.providerCode || 'UNDEFINED';

            $.ajax({
                url: soltourData.ajaxurl,
                type: 'POST',
                data: {
                    action: 'soltour_get_package_details',
                    nonce: soltourData.nonce,
                    avail_token: SoltourApp.availToken,
                    budget_id: budget.budgetId,
                    hotel_code: hotelCode,
                    provider_code: providerCode
                },
                success: function(response) {
                    if (response.success && response.data && response.data.hotelDetails) {
                        SoltourApp.enrichedPackages[hotelCode] = {
                            budget: budget,
                            details: response.data,
                            hotelCode: hotelCode
                        };
                    } else {
                        SoltourApp.enrichedPackages[hotelCode] = {
                            budget: budget,
                            details: null,
                            hotelCode: hotelCode
                        };
                    }
                    
                    completed++;
                    if (completed === uniqueBudgetsList.length) {
                        SoltourApp.uniqueHotels = Object.values(SoltourApp.enrichedPackages);
                        renderPackageCards(SoltourApp.uniqueHotels);
                        renderPagination();
                    }
                },
                error: function() {
                    SoltourApp.enrichedPackages[hotelCode] = {
                        budget: budget,
                        details: null,
                        hotelCode: hotelCode
                    };
                    completed++;
                    if (completed === uniqueBudgetsList.length) {
                        SoltourApp.uniqueHotels = Object.values(SoltourApp.enrichedPackages);
                        renderPackageCards(SoltourApp.uniqueHotels);
                        renderPagination();
                    }
                }
            });
        });
    }

    function renderPackageCards(packages) {
        log('=== RENDERIZANDO CARDS COMPLETOS ===');

        // Esconder modal de carregamento quando os resultados estiverem prontos
        hideLoadingModal();

        const $list = $('#soltour-results-list');
        $list.empty();

        if (packages.length === 0) {
            $list.html(`
                <div style="text-align: center; padding: 60px 20px; grid-column: 1 / -1;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📦</div>
                    <h3 style="color: #1a202c; font-size: 24px; margin-bottom: 12px;">Nenhum pacote para exibir</h3>
                    <p style="color: #6b7280; font-size: 16px;">Não há pacotes disponíveis nesta página</p>
                </div>
            `);
            return;
        }

        // Mostrar total de HOTÉIS ÚNICOS (não budgets)
        const totalUniqueHotels = SoltourApp.allUniqueHotels.length;
        $('#soltour-results-count').text(`${totalUniqueHotels} hotéis encontrados`);

        packages.forEach(function(pkg) {
            renderCompleteCard(pkg);
        });

        logSuccess(`${packages.length} cards renderizados com TODOS os campos!`);
    }

    function renderCompleteCard(pkg) {
        const $list = $('#soltour-results-list');
        const budget = pkg.budget;
        const details = pkg.details;
        const hotelService = budget.hotelServices && budget.hotelServices[0];
        const flightService = budget.flightServices && budget.flightServices[0];

        // (A) IMAGEM - PRIORIZAR AVAILABILITY
        let hotelImage = '';
        if (hotelService && hotelService.hotelCode && SoltourApp.hotelsFromAvailability[hotelService.hotelCode]) {
            const hotelFromAvail = SoltourApp.hotelsFromAvailability[hotelService.hotelCode];
            if (hotelFromAvail.mainImage) {
                hotelImage = hotelFromAvail.mainImage;
            } else if (hotelFromAvail.multimedias && hotelFromAvail.multimedias.length > 0) {
                const firstImage = hotelFromAvail.multimedias.find(m => m.type === 'IMAGE');
                if (firstImage) hotelImage = firstImage.url;
            }
        }
        // Fallback para details
        if (!hotelImage && details && details.hotelDetails && details.hotelDetails.hotel && details.hotelDetails.hotel.multimedias) {
            const firstImage = details.hotelDetails.hotel.multimedias.find(m => m.type === 'IMAGE');
            if (firstImage) hotelImage = firstImage.url;
        }

        // (B) PAÍS e (C) CIDADE - PRIORIZAR AVAILABILITY
        let country = '';
        let city = '';
        let destinationCode = '';

        if (hotelService && hotelService.hotelCode && SoltourApp.hotelsFromAvailability[hotelService.hotelCode]) {
            const hotelFromAvail = SoltourApp.hotelsFromAvailability[hotelService.hotelCode];
            destinationCode = hotelFromAvail.destinationCode || '';
            // Se houver destinationDescription, usar diretamente
            if (hotelFromAvail.destinationDescription) {
                city = hotelFromAvail.destinationDescription;
            }
            const destInfo = DESTINATIONS_MAP[destinationCode];
            if (destInfo) {
                country = destInfo.country;
                if (!city) city = destInfo.city;
            }
        }
        // Fallback para details
        else if (details && details.hotelDetails && details.hotelDetails.hotel) {
            destinationCode = details.hotelDetails.hotel.destinationCode || '';
            const destInfo = DESTINATIONS_MAP[destinationCode];
            if (destInfo) {
                country = destInfo.country;
                city = destInfo.city;
            }
        }

        // (D) NOME DO HOTEL - APENAS DO AVAILABILITY (sem fallback para details)
        let hotelName = '';
        let hotelCode = pkg.hotelCode || 'N/A';

        // Apenas pegar do availability (nomes limpos sem tags)
        if (hotelService && hotelService.hotelCode && SoltourApp.hotelsFromAvailability[hotelService.hotelCode]) {
            const hotelFromAvail = SoltourApp.hotelsFromAvailability[hotelService.hotelCode];
            hotelName = hotelFromAvail.name || '';
            hotelCode = hotelFromAvail.code || hotelCode;
        }

        // Se não houver nome no availability, não renderizar o card
        if (!hotelName) {
            log(`Card ignorado - Hotel sem nome (código: ${hotelCode})`);
            return;
        }

        // (E) ESTRELAS - PRIORIZAR AVAILABILITY
        let hotelStars = 0;
        if (hotelService && hotelService.hotelCode && SoltourApp.hotelsFromAvailability[hotelService.hotelCode]) {
            const hotelFromAvail = SoltourApp.hotelsFromAvailability[hotelService.hotelCode];
            if (hotelFromAvail.categoryCode) {
                hotelStars = (hotelFromAvail.categoryCode.match(/\*/g) || []).length;
            }
        }
        // Fallback para details
        else if (details && details.hotelDetails && details.hotelDetails.hotel && details.hotelDetails.hotel.categoryCode) {
            hotelStars = (details.hotelDetails.hotel.categoryCode.match(/\*/g) || []).length;
        }

        // (F) ORIGEM DO VOO
        let originCity = '';
        if (SoltourApp.searchParams.origin_code) {
            originCity = ORIGINS_MAP[SoltourApp.searchParams.origin_code] || SoltourApp.searchParams.origin_code;
        }

        // (G) NOITES
        let numNights = SoltourApp.searchParams.num_nights || 7;
        if (hotelService && hotelService.startDate && hotelService.endDate) {
            const start = new Date(hotelService.startDate);
            const end = new Date(hotelService.endDate);
            numNights = Math.round((end - start) / (1000 * 60 * 60 * 24));
        }

        // (H) REGIME
        let mealPlan = '';
        if (hotelService && hotelService.mealPlan) {
            mealPlan = hotelService.mealPlan.description || hotelService.mealPlan.code || '';
        }

        // (I) JANELA DE TEMPORADA (simplificado - usar datas da busca)
        let seasonWindow = '';
        if (hotelService && hotelService.startDate && hotelService.endDate) {
            const startDate = new Date(hotelService.startDate);
            const endDate = new Date(hotelService.endDate);
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            seasonWindow = `${months[startDate.getMonth()]} ${startDate.getDate()} - ${months[endDate.getMonth()]} ${endDate.getDate()}`;
        }

        // (K) PREÇO - CORRETO!
        let price = 0;
        let currency = 'EUR';
        if (budget.priceBreakdown && budget.priceBreakdown.priceBreakdownDetails && 
            budget.priceBreakdown.priceBreakdownDetails[0] && 
            budget.priceBreakdown.priceBreakdownDetails[0].priceInfo) {
            price = budget.priceBreakdown.priceBreakdownDetails[0].priceInfo.pvp || 0;
            currency = budget.priceBreakdown.priceBreakdownDetails[0].priceInfo.currency || 'EUR';
        }

        // (L) TIPO
        const productType = 'PACOTE';

        // Construir card
        const card = `
            <div class="soltour-package-card" data-budget-id="${budget.budgetId}">
                <div class="package-image">
                    ${hotelImage ? 
                        `<img src="${hotelImage}" alt="${hotelName}" />` : 
                        '<div class="no-image">📷 Sem imagem</div>'
                    }
                    <div class="package-badge">${productType}</div>
                </div>
                <div class="package-info">
                    <div class="package-location">
                        <strong>${country}</strong>
                        <span class="package-city">${city}</span>
                    </div>
                    <h3 class="package-name">${hotelName}</h3>
                    <div class="package-stars">
                        ${hotelStars > 0 ? '⭐'.repeat(hotelStars) : '<span class="no-rating">Hotel</span>'}
                    </div>
                    <div class="package-details">
                        ${originCity ? `<p>✈️ Voos de ${originCity}</p>` : ''}
                        <p>🌙 ${numNights} Noites | ${mealPlan}</p>
                        ${seasonWindow ? `<p>📅 ${seasonWindow}</p>` : ''}
                    </div>
                </div>
                <div class="package-price">
                    <div class="price-label">PACOTE</div>
                    <div class="price-amount">${price.toFixed(0)}€</div>
                    <button class="soltour-btn soltour-btn-primary"
                            style="padding: 20px 35px !important; border-radius: 100px !important; background: #019CB8 !important; color: #fff !important; border: none !important; font-size: 16px !important; font-weight: 700 !important; width: 100% !important;"
                            onclick="SoltourApp.selectPackage('${budget.budgetId}', '${hotelCode}', '${hotelService.providerCode || 'UNDEFINED'}')">
                        Ver Detalhes
                    </button>
                </div>
            </div>
        `;
        $list.append(card);
    }

    /**
     * Nova função: Renderizar uma página LOCAL dos hotéis únicos (slice do array)
     */
    function renderLocalPage(page) {
        log(`=== RENDERIZANDO PÁGINA LOCAL ${page} ===`);

        SoltourApp.currentPage = page;

        // Calcular índices para slice
        const startIndex = (page - 1) * SoltourApp.itemsPerPage;
        const endIndex = startIndex + SoltourApp.itemsPerPage;

        // Pegar apenas os hotéis da página atual
        const hotelsForPage = SoltourApp.allUniqueHotels.slice(startIndex, endIndex);

        log(`Mostrando hotéis ${startIndex + 1} a ${Math.min(endIndex, SoltourApp.allUniqueHotels.length)} de ${SoltourApp.allUniqueHotels.length}`);
        log(`Hotéis nesta página: ${hotelsForPage.length}`);

        // Renderizar cards
        renderPackageCards(hotelsForPage);

        // Renderizar paginação
        renderPagination();

        // Scroll para o topo
        const $resultsList = $('#soltour-results-list');
        if ($resultsList.length > 0 && $resultsList.offset()) {
            $('html, body').animate({scrollTop: $resultsList.offset().top - 100}, 300);
        } else {
            $('html, body').animate({scrollTop: 0}, 300);
        }
    }

    function renderPagination() {
        // Calcular total de páginas baseado em hotéis ÚNICOS, não budgets
        const totalUniqueHotels = SoltourApp.allUniqueHotels.length;
        const totalPages = Math.ceil(totalUniqueHotels / SoltourApp.itemsPerPage);

        log(`=== PAGINAÇÃO ===`);
        log(`Total de hotéis únicos: ${totalUniqueHotels}`);
        log(`Página atual: ${SoltourApp.currentPage}`);
        log(`Total de páginas: ${totalPages}`);

        if (totalPages <= 1) {
            $('#soltour-pagination').hide();
            log('Paginação oculta - apenas 1 página');
            return;
        }

        let html = '<div class="pagination-controls">';

        // Seta Anterior
        if (SoltourApp.currentPage > 1) {
            html += `<button onclick="SoltourApp.loadPage(${SoltourApp.currentPage - 1})" class="pagination-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>`;
        } else {
            html += `<button class="pagination-arrow disabled" disabled>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>`;
        }

        // Dots para indicar páginas
        html += '<div class="pagination-dots">';
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === SoltourApp.currentPage ? 'active' : '';
            html += `<span class="pagination-dot ${activeClass}" onclick="SoltourApp.loadPage(${i})"></span>`;
        }
        html += '</div>';

        // Indicador de página atual
        html += `<div class="pagination-info">${SoltourApp.currentPage} / ${totalPages}</div>`;

        // Seta Próxima
        if (SoltourApp.currentPage < totalPages) {
            html += `<button onclick="SoltourApp.loadPage(${SoltourApp.currentPage + 1})" class="pagination-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>`;
        } else {
            html += `<button class="pagination-arrow disabled" disabled>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>`;
        }

        html += '</div>';

        $('#soltour-pagination').html(html).show();
        logSuccess('Paginação renderizada');
    }

    window.SoltourApp.loadPage = function(page) {
        log(`=== CARREGANDO PÁGINA ${page} (PAGINAÇÃO LOCAL) ===`);
        log(`Página anterior: ${SoltourApp.currentPage}`);

        // Usar paginação LOCAL - não fazer nova chamada à API
        // Todos os hotéis únicos já estão em SoltourApp.allUniqueHotels
        renderLocalPage(page);
    };

    window.SoltourApp.selectPackage = function(budgetId, hotelCode, providerCode) {
        log('=== SELECT PACKAGE ===');
        log(`Budget: ${budgetId}, Hotel: ${hotelCode}, Provider: ${providerCode}`);

        // Verificar se venda está permitida ANTES de prosseguir
        checkAllowedSellingBeforeSelect(budgetId, hotelCode, providerCode);
    };

    /**
     * Verifica se venda está permitida antes de selecionar pacote
     * Implementa validação do site oficial
     */
    function checkAllowedSellingBeforeSelect(budgetId, hotelCode, providerCode) {
        log('🔒 Verificando se venda está permitida...');

        showLoadingModal('Verificando disponibilidade...', 'Validando seu pacote');

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
                    log('✅ Venda permitida - prosseguindo...');

                    // Permitir seleção do pacote
                    proceedWithPackageSelection(budgetId, hotelCode, providerCode);

                } else {
                    // Venda não permitida
                    const message = response.data && response.data.message
                        ? response.data.message
                        : 'Desculpe, este pacote não está disponível para venda no momento. Por favor, tente outro pacote ou entre em contato conosco.';

                    logError('❌ Venda não permitida: ' + message);

                    // Usar toast em vez de alert
                    if (window.SoltourApp.Toast) {
                        window.SoltourApp.Toast.error(message, 6000);
                    } else {
                        alert(message);
                    }
                }
            },
            error: function(xhr, status, error) {
                hideLoadingModal();

                logError('Erro ao verificar venda permitida:', error);

                // Em caso de erro, permitir continuar (fail-safe)
                // Pode mudar para fail-secure se preferir
                log('⚠️ Erro na verificação - permitindo continuar (fail-safe)');
                proceedWithPackageSelection(budgetId, hotelCode, providerCode);
            }
        });
    }

    /**
     * Prossegue com seleção do pacote após validação
     */
    function proceedWithPackageSelection(budgetId, hotelCode, providerCode) {
        log('📦 Salvando seleção e redirecionando...');

        sessionStorage.setItem('soltour_selected_package', JSON.stringify({
            budgetId: budgetId,
            hotelCode: hotelCode,
            providerCode: providerCode,
            availToken: SoltourApp.availToken
        }));

        window.location.href = `/pacote-detalhes/?budget=${budgetId}`;
    }

})(jQuery);
