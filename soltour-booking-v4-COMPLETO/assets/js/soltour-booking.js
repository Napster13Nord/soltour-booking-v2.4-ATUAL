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
        currentMonth: new Date().getMonth() + 1,
        currentYear: new Date().getFullYear(),
        currentPage: 1,
        itemsPerPage: 10,
        totalBudgets: 0,
        allBudgets: [],
        enrichedPackages: {},
        uniqueHotels: [],
        minDate: null,
        maxDate: null
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

    $(document).ready(function() {
        log('Plugin V4 inicializado - COMPLETO');
        initSearchForm();
        initResultsPage();
    });

    function initSearchForm() {
        if ($('#soltour-search-form').length === 0) return;
        
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

        SoltourApp.searchParams = {
            action: 'soltour_search_packages',
            nonce: soltourData.nonce,
            origin_code: SoltourApp.searchParams.originCode,
            destination_code: SoltourApp.searchParams.destinationCode,
            start_date: startDate,
            num_nights: nights,
            rooms: JSON.stringify([{ passengers: passengers }]),
            first_item: 0,
            item_count: SoltourApp.itemsPerPage
        };

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
            SoltourApp.searchParams = JSON.parse(savedParams);
            searchPackagesAjax();
        }
    }

    function searchPackagesAjax() {
        log('=== BUSCA INICIADA ===');
        $('#soltour-results-loading').show();
        $('#soltour-results-list').empty();

        $.ajax({
            url: soltourData.ajaxurl,
            type: 'POST',
            data: SoltourApp.searchParams,
            success: function(response) {
                $('#soltour-results-loading').hide();
                
                if (response.success && response.data) {
                    SoltourApp.availToken = response.data.availToken;
                    SoltourApp.allBudgets = response.data.budgets || [];
                    SoltourApp.totalBudgets = response.data.totalCount || SoltourApp.allBudgets.length;

                    logSuccess(`${SoltourApp.allBudgets.length} budgets recebidos`);

                    if (SoltourApp.allBudgets.length > 0) {
                        loadPageDetailsWithDeduplication(SoltourApp.allBudgets);
                    } else {
                        $('#soltour-no-results').show();
                    }
                }
            },
            error: function(xhr, status, error) {
                $('#soltour-results-loading').hide();
                $('#soltour-no-results').show();
                logError('Erro na busca', error);
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
        const $list = $('#soltour-results-list');
        $list.empty();

        if (packages.length === 0) {
            $('#soltour-no-results').show();
            return;
        }

        $('#soltour-results-count').text(`${packages.length} pacotes encontrados`);

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

        // (A) IMAGEM
        let hotelImage = '';
        if (details && details.hotelDetails && details.hotelDetails.hotel && details.hotelDetails.hotel.multimedias) {
            const firstImage = details.hotelDetails.hotel.multimedias.find(m => m.type === 'IMAGE');
            if (firstImage) hotelImage = firstImage.url;
        }

        // (B) PAÍS e (C) CIDADE
        let country = '';
        let city = '';
        let destinationCode = '';
        if (details && details.hotelDetails && details.hotelDetails.hotel) {
            destinationCode = details.hotelDetails.hotel.destinationCode || '';
            const destInfo = DESTINATIONS_MAP[destinationCode];
            if (destInfo) {
                country = destInfo.country;
                city = destInfo.city;
            }
        }

        // (D) NOME DO HOTEL
        let hotelName = 'Hotel';
        let hotelCode = pkg.hotelCode || 'N/A';
        if (details && details.hotelDetails && details.hotelDetails.hotel) {
            hotelName = details.hotelDetails.hotel.name || hotelName;
            hotelCode = details.hotelDetails.hotel.code || hotelCode;
        }

        // (E) ESTRELAS
        let hotelStars = 0;
        if (details && details.hotelDetails && details.hotelDetails.hotel && details.hotelDetails.hotel.categoryCode) {
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
            <div class="soltour-package-card">
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
                            onclick="SoltourApp.selectPackage('${budget.budgetId}', '${hotelCode}', '${hotelService.providerCode || 'UNDEFINED'}')">
                        Ver Detalhes
                    </button>
                </div>
            </div>
        `;
        $list.append(card);
    }

    function renderPagination() {
        const totalPages = Math.ceil(SoltourApp.totalBudgets / SoltourApp.itemsPerPage);
        if (totalPages <= 1) {
            $('#soltour-pagination').hide();
            return;
        }

        let html = '<div class="pagination-controls">';
        if (SoltourApp.currentPage > 1) {
            html += `<button onclick="SoltourApp.loadPage(${SoltourApp.currentPage - 1})" class="soltour-btn">← Anterior</button>`;
        }
        html += '<div class="page-numbers">';
        for (let i = 1; i <= Math.min(totalPages, 10); i++) {
            const active = i === SoltourApp.currentPage ? 'active' : '';
            html += `<button onclick="SoltourApp.loadPage(${i})" class="page-number ${active}">${i}</button>`;
        }
        html += '</div>';
        if (SoltourApp.currentPage < totalPages) {
            html += `<button onclick="SoltourApp.loadPage(${SoltourApp.currentPage + 1})" class="soltour-btn">Próximo →</button>`;
        }
        html += '</div>';
        $('#soltour-pagination').html(html).show();
    }

    window.SoltourApp.loadPage = function(page) {
        SoltourApp.currentPage = page;
        $('html, body').animate({scrollTop: 0}, 300);
        SoltourApp.searchParams.first_item = (page - 1) * SoltourApp.itemsPerPage;
        searchPackagesAjax();
    };

    window.SoltourApp.selectPackage = function(budgetId, hotelCode, providerCode) {
        sessionStorage.setItem('soltour_selected_package', JSON.stringify({
            budgetId: budgetId,
            hotelCode: hotelCode,
            providerCode: providerCode,
            availToken: SoltourApp.availToken
        }));
        window.location.href = `/pacote-detalhes/?budget=${budgetId}`;
    };

})(jQuery);
