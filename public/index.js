const inpt_prdt_id = document.getElementById('inpt_prdt_id');
const btn_add_prdt = document.getElementById('btn_add_prdt');
const prdt_list = document.getElementById('prdt_list');
const alerts_placeholder = document.getElementById('alerts_placeholder');
const add_spinner = document.getElementById('add_spinner');
const date_range_start = document.getElementById('date_range_start');
const date_range_end = document.getElementById('date_range_end');
const btn_date_range = document.getElementById('btn_date_range');
const btn_date_range_reset = document.getElementById('btn_date_range_reset');

let priceChart;
let stockChart;

async function displayData() {

    /* Get product list from DB */
    let chartsData = await getChartsData();

    /* Display charts and product list */
    displayPriceChart(chartsData.priceData, chartsData.lbls);
    displayStockChart(chartsData.stockData, chartsData.lbls);
    fillPrdtList(chartsData.prdts);
}

async function getProducts() {
    let resp = await fetch('/products');
    let data = await resp.json();
    return data.products;
}

function getLabels(products) {
    /* Récupérer un array contenant les objects pricing */
    let labels = products.map(prdt => prdt.pricing);

    /* Trouver celui avec le plus grand nombre d'éléments */
    labels = labels[labels.reduce((maxI, el, i, arr) =>
        (el.length > arr[maxI].length) ? i : maxI, 0)];

    /* Uniquement garder les dates */
    return labels.map(d => d.date);
}

async function getChartsData() {

    let products = await getProducts();

    let labels = getLabels(products);

    /* Créer l'array de datasets pour les prix */
    let pricesDatasetArray = createDataset(products, labels.length, 'price');

    /* Créer l'array de datasets pour la disponibilité */
    let stockDatasetArray = createDataset(products, labels.length, 'stock');

    return {prdts: products,
            priceData: pricesDatasetArray,
            stockData: stockDatasetArray,
            lbls: labels};
}

function displayPriceChart(data, lbls) {
    let ctx = document.getElementById('priceChart');

    const fontColor = '#fff';
    const gridColor = {borderColor: '#4e5865', color: '#30363d'};

    const options = {
        type: 'line',
        data: {
            labels: lbls,
            datasets: data
        },
        options: {
            responsive: true,
            color: fontColor,
            scales: {
                x: {
                    ticks: {
                        color: fontColor
                    },
                    grid: gridColor
                },
                y: {
                    ticks: {
                        color: fontColor
                    },
                    title: {
                        display: true,
                        text: 'Prix en €',
                        color: fontColor,
                        font: {
                            size: 18
                        }
                    },
                    grid: gridColor
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Courbe des prix',
                    color: fontColor,
                    font: {
                        size: 30
                    }
                }
            }
        }
    };

    priceChart = new Chart(ctx, options);
}

function displayStockChart(data, lbls) {

    let ctx = document.getElementById("stockChart");

    const stockLabels = ['EN STOCK', 'SOUS 7 JOURS', 'ENTRE 7/15 JOURS', '+ DE 15 JOURS', 'RUPTURE'];
    const fontColor = '#fff';
    const gridColor = {borderColor: '#4e5865', color: '#30363d'};

    const options = {
        type: 'line',
        data: {
            labels: lbls,
            datasets: data
        },
        options: {
            responsive: true,
            color: fontColor,
            plugins: {
                title: {
                    display: true,
                    text: 'Courbe de la disponibilité',
                    color: fontColor,
                    font: {
                        size: 30
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: fontColor
                    },
                    grid: gridColor
                },
                y: {
                    ticks: {
                        color: fontColor
                    },
                    type: 'category',
                    labels: stockLabels,
                    grid: gridColor
                }
            }
        }
    };

    stockChart = new Chart(ctx, options);
}

function fillPrdtList(products) {

    prdt_list.innerHTML = '';

    let prdts = products.map(prdt => {
        return {id: prdt._id, url: prdt.url,
                name: prdt.name,
                inStock: prdt.pricing.length != 0
                    ? prdt.pricing[prdt.pricing.length - 1].instock
                    : 'RUPTURE'};
    });

    for (let p of prdts) {
        let tr = document.createElement('tr');
        let td_title = document.createElement('td');
        td_title.className = 'prdt_id_holder';
        td_title.id = p.id;
        let link = document.createElement('a');
        link.className = 'prdt_link';
        link.target = '_blank';
        link.href = p.url;
        link.innerHTML = p.name;
        td_title.append(link);
        tr.append(td_title);

        let td_stock = document.createElement('td');
        td_stock.className = 'td_center';
        let img_stock = document.createElement('img');
        img_stock.src = './icons/stockNo.svg';
        img_stock.src = './icons/' + (p.inStock == 'RUPTURE' ? 'stockNo'
            : p.inStock == 'EN STOCK' ? 'stockYes' : 'stockLater') + '.svg';
        img_stock.className = 'icon';
        td_stock.append(img_stock);
        tr.append(td_stock);

        let td_del = document.createElement('td');
        td_del.className = 'td_center';
        let img_del = document.createElement('img');
        img_del.src = './icons/delete.svg';
        img_del.className = 'icon img_del';
        td_del.append(img_del);
        tr.append(td_del);

        prdt_list.append(tr);
    }
}

async function refreshCharts() {

    let chartData = await getChartsData();

    fillPrdtList(chartData.prdts);

    priceChart.data.labels = chartData.lbls;
    priceChart.data.datasets = chartData.priceData;

    stockChart.data.labels = chartData.lbls;
    stockChart.data.datasets = chartData.stockData;

    priceChart.update();
    stockChart.update();
}

function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


/* Ajout d'un produit */
btn_add_prdt.onclick = async function addProduct() {

    let prdt_id = inpt_prdt_id.value;
    prdt_id = prdt_id.substring(prdt_id.lastIndexOf('/') +1, prdt_id.lastIndexOf('.'));

    if (prdt_id.length == 0) {
        alertBox('Saisie invalide. Entrez bien un url de produit LDLC.', true);
    } else {

        add_spinner.style.display = 'inline-block';
        btn_add_prdt.disabled = true;
        try {
            let res = await fetch('/add/' + prdt_id, { method: 'POST' });
            let ans = await res.json();

            let status = res.status;
            if (status == 201) {
                createAlert('success', ans.message);
                refreshCharts();
            } else {
                createAlert(status == 404 ? 'warning' : 'danger', ans.message);
            }
        } catch (err) {
            createAlert('danger', err);
        } finally {
            add_spinner.style.display = 'none';
            btn_add_prdt.disabled = false;
        }
    }
}

/* Suppression d'un produit */
$(document).on('click','.img_del', function() {
    let prdt_id = document.getElementsByClassName('prdt_id_holder')[$('.img_del').index(this)].id;

    fetch('/delete/' + prdt_id, {method: 'DELETE'})
    .then(res => res.json())
    .then(res => {
        createAlert('success', res.message);
        refreshCharts();
    })
    .catch(err => {
        createAlert('danger', res.message);
    })
});

/* type: success | warning | error -> danger */
function createAlert(type, message) {
    let wrapper = document.createElement('div');
    wrapper.innerHTML =
        '<div class="alert alert-' + type + ' alert-dismissible fade show td_center" role="alert">'
        + (type == 'success' ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-check-circle flex-shrink-0 me-2" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-exclamation-triangle-fill flex-shrink-0 me-2" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>'
        ) + '<strong>' + message + '</strong>'
        + '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>';
    alerts_placeholder.append(wrapper);
}

/* Ajuster les dates de début et de fin des données */
btn_date_range.onclick = async function () {

    let startDate = new Date(date_range_start.value).toLocaleDateString('fr-FR');
    let endDate = new Date(date_range_end.value).toLocaleDateString('fr-FR');

    if (startDate != 'Invalid Date' && endDate != 'Invalid Date') {

        let products = await getProducts();

        let labels = getLabels(products);

        let cutLabels = labels.slice(labels.indexOf(startDate), labels.indexOf(endDate) +1);

        /* Transformer en Date */
        let labelStartDate = dateStringToObj(labels[0]);
        let labelEndDate = dateStringToObj(labels[labels.length -1]);

        startDate = dateStringToObj(startDate);
        endDate = dateStringToObj(endDate);

        if (startDate < endDate && labelStartDate <= startDate && endDate <= labelEndDate) {

            for (let i = 0; i < products.length; i++) {
                let newPricingArray = [];
                for (let j = 0; j < products[i].pricing.length; j++) {
                    let curDate = dateStringToObj(products[i].pricing[j].date);

                    /* Garder si la date est dans l'intervale voulu */
                    if (startDate <= curDate && curDate <= endDate) {
                        newPricingArray.push(products[i].pricing[j]);
                    }
                }
                products[i].pricing = newPricingArray;
            }

            /* Créer l'array de datasets pour les prix */
            let pricesDatasetArray = createDataset(products, cutLabels.length, 'price');

            /* Créer l'array de datasets pour la disponibilité */
            let stockDatasetArray = createDataset(products, cutLabels.length, 'stock');

            /* Update charts */
            priceChart.data.labels = cutLabels;
            priceChart.data.datasets = pricesDatasetArray;
            priceChart.update();

            stockChart.data.labels = cutLabels;
            stockChart.data.datasets = stockDatasetArray;
            stockChart.update();

        } else {
            createAlert('warning', 'Les dates demandées sont incohérentes.');
        }

    } else {
        createAlert('warning', 'Au moins une date est invalide.');
    }
}

/* type: price | stock */
function createDataset(products, lblLength, type) {
    return products.map(prdt => {
        let curData = prdt.pricing.map(obj => type == 'price' ? obj.price : obj.instock);
        while (curData.length < lblLength) {
            /* Remplir le début de l'array avec des nulls */
            curData.unshift(null);
        }

        let color = getRandomColor();

        return {label: prdt.name,
                backgroundColor: color,
                borderColor: color,
                data: curData};
    });
}

/* Réinitialiser les graphiques */
btn_date_range_reset.onclick = function() {refreshCharts()}

/* String au format jj/mm/aaaa vers un objet Date */
function dateStringToObj(str) {
    return new Date(str.substring(6), str.substring(3, 5) -1, str.substring(0, 2));
}

displayData();