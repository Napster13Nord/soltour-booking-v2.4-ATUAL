/**
 * Formulário de Busca Simplificado - BeautyTravel
 * Fluxo oficial Soltour: Destino + Origem + Mês → Cards → Modal → Resultados
 */

(function($) {
    'use strict';

    // Aguardar DOM ready
    $(document).ready(function() {
        console.log('=== BEAUTY TRAVEL SIMPLE SEARCH ===');
        console.log('jQuery version:', $.fn.jquery);
        console.log('soltourData exists:', typeof soltourData !== 'undefined');

        if (typeof soltourData !== 'undefined') {
            console.log('soltourData.ajaxurl:', soltourData.ajaxurl);
            console.log('soltourData.nonce exists:', !!soltourData.nonce);
        } else {
            console.error('❌ soltourData não está definido! O script não foi localizado corretamente.');
            alert('Erro: Configuração do plugin não encontrada. Por favor, recarregue a página.');
            return;
        }

        initSimpleSearch();
    });

    /**
     * Inicializar formulário simplificado
     */
    function initSimpleSearch() {
        console.log('🔍 Procurando formulário #soltour-search-form-simple...');
        const $form = $('#soltour-search-form-simple');

        console.log('Formulário encontrado?', $form.length > 0);
        console.log('Total de elementos com id contendo "soltour":', $('[id*="soltour"]').length);

        if ($form.length === 0) {
            console.error('❌ Formulário simplificado não encontrado!');
            console.log('Forms na página:', $('form').length);
            console.log('IDs de forms:', $('form').map(function() { return this.id; }).get());
            return;
        }

        console.log('✅ Formulário simplificado detectado');

        // Carregar destinos e origens
        console.log('📥 Iniciando carregamento de destinos e origens...');
        loadDestinations();
        loadOrigins();

        // Bind submit
        $form.on('submit', function(e) {
            e.preventDefault();
            handleSimpleSearch();
        });
    }

    /**
     * Carregar lista de destinos
     */
    function loadDestinations() {
        console.log('📍 Carregando destinos...');
        console.log('URL:', soltourData.ajaxurl);
        console.log('Action: soltour_get_destinations');

        $.ajax({
            url: soltourData.ajaxurl,
            type: 'POST',
            data: {
                action: 'soltour_get_destinations',
                nonce: soltourData.nonce
            },
            beforeSend: function() {
                console.log('📤 Enviando requisição para destinos...');
            },
            success: function(response) {
                console.log('📥 Resposta recebida (destinos):', response);

                if (response.success && response.data && response.data.destinations) {
                    console.log(`✅ ${response.data.destinations.length} destinos carregados`);
                    console.log('Primeiro destino:', response.data.destinations[0]);
                    populateDestinations(response.data.destinations);
                } else {
                    console.error('❌ Erro ao carregar destinos:', response);
                    alert('Erro ao carregar destinos. Verifique o console para mais detalhes.');
                }
            },
            error: function(xhr, status, error) {
                console.error('❌ Erro AJAX ao carregar destinos');
                console.error('Status:', status);
                console.error('Error:', error);
                console.error('Response:', xhr.responseText);
                alert('Erro de conexão ao carregar destinos: ' + error);
            }
        });
    }

    /**
     * Carregar lista de origens
     */
    function loadOrigins() {
        console.log('✈️ Carregando origens...');
        console.log('URL:', soltourData.ajaxurl);
        console.log('Action: soltour_get_origins');

        $.ajax({
            url: soltourData.ajaxurl,
            type: 'POST',
            data: {
                action: 'soltour_get_origins',
                nonce: soltourData.nonce
            },
            beforeSend: function() {
                console.log('📤 Enviando requisição para origens...');
            },
            success: function(response) {
                console.log('📥 Resposta recebida (origens):', response);

                if (response.success && response.data && response.data.origins) {
                    console.log(`✅ ${response.data.origins.length} origens carregadas`);
                    console.log('Primeira origem:', response.data.origins[0]);
                    populateOrigins(response.data.origins);
                } else {
                    console.error('❌ Erro ao carregar origens:', response);
                    alert('Erro ao carregar origens. Verifique o console para mais detalhes.');
                }
            },
            error: function(xhr, status, error) {
                console.error('❌ Erro AJAX ao carregar origens');
                console.error('Status:', status);
                console.error('Error:', error);
                console.error('Response:', xhr.responseText);
                alert('Erro de conexão ao carregar origens: ' + error);
            }
        });
    }

    /**
     * Preencher select de destinos
     */
    function populateDestinations(destinations) {
        console.log('🎯 Populando select de destinos...');
        const $select = $('#soltour-destination-simple');

        console.log('Select encontrado?', $select.length > 0);
        console.log('Select atual tem', $select.find('option').length, 'opções');

        if ($select.length === 0) {
            console.error('❌ Select #soltour-destination-simple não encontrado!');
            return;
        }

        destinations.forEach(function(dest) {
            $select.append(
                $('<option></option>')
                    .val(dest.code)
                    .text(dest.description || dest.name)
            );
        });

        console.log('✅ Select de destinos populado. Total de opções:', $select.find('option').length);
    }

    /**
     * Preencher select de origens
     */
    function populateOrigins(origins) {
        console.log('🎯 Populando select de origens...');
        const $select = $('#soltour-origin-simple');

        console.log('Select encontrado?', $select.length > 0);
        console.log('Select atual tem', $select.find('option').length, 'opções');

        if ($select.length === 0) {
            console.error('❌ Select #soltour-origin-simple não encontrado!');
            return;
        }

        origins.forEach(function(origin) {
            $select.append(
                $('<option></option>')
                    .val(origin.code)
                    .text(origin.description || origin.name)
            );
        });

        console.log('✅ Select de origens populado. Total de opções:', $select.find('option').length);
    }

    /**
     * Processar busca simplificada
     */
    function handleSimpleSearch() {
        console.log('🔍 Processando busca simplificada...');

        // Coletar dados do formulário
        const destination = $('#soltour-destination-simple').val();
        const origin = $('#soltour-origin-simple').val();
        const month = $('#soltour-month-simple').val();

        // Validar
        if (!destination || !origin || !month) {
            alert('⚠️ Por favor, preencha todos os campos!');
            return;
        }

        console.log('Parâmetros:', { destination, origin, month });

        // Salvar parâmetros iniciais no sessionStorage
        sessionStorage.setItem('soltour_initial_search', JSON.stringify({
            destination: destination,
            origin: origin,
            month: month
        }));

        // Mostrar loading
        $('#soltour-search-loading').show();
        $('button[type="submit"]').prop('disabled', true);

        // Buscar cidades/destinos disponíveis
        fetchAvailableDestinations(destination, origin, month);
    }

    /**
     * Buscar destinos disponíveis (cidades) para o país selecionado
     */
    function fetchAvailableDestinations(destinationCode, originCode, month) {
        console.log('🌍 Buscando cidades disponíveis...');

        // Calcular primeira e última data do mês
        const [year, monthNum] = month.split('-');
        const startDate = `${year}-${monthNum}-01`;
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endDate = `${year}-${monthNum}-${lastDay}`;

        $.ajax({
            url: soltourData.ajaxurl,
            type: 'POST',
            data: {
                action: 'soltour_search_packages',
                nonce: soltourData.nonce,
                destination_code: destinationCode,
                origin_code: originCode,
                start_date: startDate,
                num_nights: 7, // Default
                adults: 2, // Default
                children: 0,
                item_count: 100,
                force_avail: false // Só queremos ver disponibilidade, não preços ainda
            },
            success: function(response) {
                $('#soltour-search-loading').hide();
                $('button[type="submit"]').prop('disabled', false);

                console.log('📦 Resposta da API:', response);

                if (response.success && response.data && response.data.budgets) {
                    // Extrair cidades únicas dos budgets
                    const cities = extractUniqueCities(response.data.budgets, response.data.hotels);

                    if (cities.length > 0) {
                        console.log(`✅ ${cities.length} cidades encontradas`);
                        renderDestinationCards(cities);
                    } else {
                        alert('❌ Nenhum destino disponível para os parâmetros selecionados. Tente outras datas ou origens.');
                    }
                } else {
                    alert('❌ Erro ao buscar destinos. Por favor, tente novamente.');
                }
            },
            error: function(xhr, status, error) {
                $('#soltour-search-loading').hide();
                $('button[type="submit"]').prop('disabled', false);

                console.error('❌ Erro AJAX:', error);
                alert('❌ Erro de conexão. Por favor, tente novamente.');
            }
        });
    }

    /**
     * Extrair cidades únicas dos budgets
     */
    function extractUniqueCities(budgets, hotelsData) {
        const citiesMap = {};

        budgets.forEach(function(budget) {
            const hotelService = budget.hotelServices && budget.hotelServices[0];
            if (!hotelService) return;

            const hotelCode = hotelService.hotelCode;
            const hotel = hotelsData && hotelsData.find(h => h.code === hotelCode);

            if (hotel && hotel.destinationCode) {
                const cityCode = hotel.destinationCode;
                const cityName = hotel.destinationDescription || hotel.destinationName || 'Destino';
                const cityImage = hotel.mainImage || (hotel.multimedias && hotel.multimedias[0] && hotel.multimedias[0].url);

                if (!citiesMap[cityCode]) {
                    citiesMap[cityCode] = {
                        code: cityCode,
                        name: cityName,
                        image: cityImage,
                        hotelCount: 1,
                        minPrice: extractPrice(budget)
                    };
                } else {
                    citiesMap[cityCode].hotelCount++;
                    const price = extractPrice(budget);
                    if (price < citiesMap[cityCode].minPrice) {
                        citiesMap[cityCode].minPrice = price;
                    }
                }
            }
        });

        return Object.values(citiesMap);
    }

    /**
     * Extrair preço do budget
     */
    function extractPrice(budget) {
        if (budget.priceBreakdown && budget.priceBreakdown.priceBreakdownDetails &&
            budget.priceBreakdown.priceBreakdownDetails[0] &&
            budget.priceBreakdown.priceBreakdownDetails[0].priceInfo) {
            return budget.priceBreakdown.priceBreakdownDetails[0].priceInfo.pvp || 0;
        }
        return 0;
    }

    /**
     * Renderizar cards de destinos
     */
    function renderDestinationCards(cities) {
        console.log('🎨 Renderizando cards de destinos...');

        const $container = $('#soltour-cards-grid');
        $container.empty();

        cities.forEach(function(city) {
            const card = `
                <div class="bt-destination-card" data-city-code="${city.code}" data-city-name="${city.name}">
                    <div class="bt-card-image" style="background-image: url('${city.image || 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(city.name)}')">
                        <div class="bt-card-overlay">
                            <div class="bt-card-price">
                                Desde <span>${city.minPrice > 0 ? city.minPrice.toFixed(0) + '€' : 'Consultar'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="bt-card-content">
                        <h4 class="bt-card-title">${city.name}</h4>
                        <p class="bt-card-hotels">
                            <i class="fas fa-hotel"></i>
                            ${city.hotelCount} ${city.hotelCount === 1 ? 'hotel disponível' : 'hotéis disponíveis'}
                        </p>
                        <button type="button" class="bt-btn-select-city">
                            Escolher Este Destino
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `;

            $container.append(card);
        });

        // Mostrar container de cards
        $('#soltour-destination-cards').slideDown(400);

        // Scroll suave até os cards
        $('html, body').animate({
            scrollTop: $('#soltour-destination-cards').offset().top - 100
        }, 600);

        // Bind click nos cards
        bindCardClicks();

        console.log('✅ Cards renderizados');
    }

    /**
     * Bind clicks nos cards de destinos
     */
    function bindCardClicks() {
        $('.bt-destination-card').off('click').on('click', function() {
            const cityCode = $(this).data('city-code');
            const cityName = $(this).data('city-name');

            console.log('🎯 Card clicado:', cityName, cityCode);

            // Pegar parâmetros iniciais
            const initialSearch = JSON.parse(sessionStorage.getItem('soltour_initial_search'));

            // Preparar dados do destino para o modal
            const destinationData = {
                code: cityCode,
                name: cityName,
                country: initialSearch.destination,
                originCode: initialSearch.origin,
                month: initialSearch.month
            };

            // Abrir modal de busca detalhada (que já existe!)
            if (window.BeautyTravelSearchModal) {
                console.log('✅ Abrindo modal de busca detalhada...');
                window.BeautyTravelSearchModal.open(destinationData);
            } else {
                console.error('❌ Modal não encontrado!');
                alert('Erro ao abrir modal. Por favor, recarregue a página.');
            }
        });
    }

})(jQuery);
