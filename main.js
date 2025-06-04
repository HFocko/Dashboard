import Papa from 'papaparse';
import Chart from 'chart.js/auto';

let distributionChart = null;
let trendChart = null;

// Function to load and parse CSV data
async function loadData(filename) {
    try {
        const response = await fetch(filename);
        const csvData = await response.text();
        return new Promise((resolve) => {
            Papa.parse(csvData, {
                header: true,
                complete: (results) => resolve(results.data),
                skipEmptyLines: true
            });
        });
    } catch (error) {
        console.error('Error loading data:', error);
        return [];
    }
}

// Function to update total records
function updateTotalRecords(data) {
    document.getElementById('totalRecords').textContent = data.length;
}

// Function to create or update distribution chart
function updateDistributionChart(data, label, values) {
    const ctx = document.getElementById('distributionChart');
    
    if (distributionChart) {
        distributionChart.destroy();
    }

    const counts = values.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});

    distributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: [
                    '#2ecc71',
                    '#3498db',
                    '#9b59b6',
                    '#f1c40f',
                    '#e74c3c'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Distribution by ${label}`
                }
            }
        }
    });
}

// Function to create or update trend chart
function updateTrendChart(data, xAxis, yAxis) {
    const ctx = document.getElementById('trendChart');
    
    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item[xAxis]).slice(0, 50),
            datasets: [{
                label: yAxis,
                data: data.map(item => item[yAxis]).slice(0, 50),
                borderColor: '#3498db',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `${yAxis} over ${xAxis}`
                }
            }
        }
    });
}

// Function to update statistics
function updateStatistics(data, numericColumn) {
    const values = data.map(item => parseFloat(item[numericColumn])).filter(val => !isNaN(val));
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    const statsContainer = document.getElementById('statistics');
    statsContainer.innerHTML = `
        <div>
            <strong>Average</strong>
            <p>${avg.toFixed(2)}</p>
        </div>
        <div>
            <strong>Maximum</strong>
            <p>${max.toFixed(2)}</p>
        </div>
        <div>
            <strong>Minimum</strong>
            <p>${min.toFixed(2)}</p>
        </div>
    `;
}

// Function to update data table
function updateDataTable(data) {
    const headers = Object.keys(data[0]);
    const headerRow = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');

    // Update headers
    headerRow.innerHTML = headers.map(header => `<th>${header}</th>`).join('');

    // Update body
    tableBody.innerHTML = data.slice(0, 10).map(row => `
        <tr>
            ${headers.map(header => `<td>${row[header]}</td>`).join('')}
        </tr>
    `).join('');
}

// Function to initialize dashboard
async function initializeDashboard() {
    const datasetSelect = document.getElementById('datasetSelect');
    
    async function updateDashboard() {
        const selectedDataset = datasetSelect.value;
        const filename = selectedDataset === 'netflix' ? 'netflix_titles.csv' : 'addiction_population_data.csv';
        
        const data = await loadData(filename);
        
        if (data.length > 0) {
            updateTotalRecords(data);
            
            if (selectedDataset === 'netflix') {
                updateDistributionChart(data, 'type', data.map(item => item.type));
                updateTrendChart(data, 'release_year', 'duration');
                updateStatistics(data, 'release_year');
            } else {
                updateDistributionChart(data, 'Year', data.map(item => item.Year));
                updateTrendChart(data, 'Year', 'Population');
                updateStatistics(data, 'Population');
            }
            
            updateDataTable(data);
        }
    }

    datasetSelect.addEventListener('change', updateDashboard);
    await updateDashboard();
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initializeDashboard);