let pieChart = null; 

// 主题切换功能
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.querySelector('.theme-icon');

// 从本地存储加载主题
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeIcon.textContent = '☀️';
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeIcon.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // 如果图表已存在，更新图表颜色
    if (pieChart) {
        updateChartColors();
    }
});

document.getElementById('calculate').addEventListener('click', calculatePortfolio);

// 监听输入框回车键
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            calculatePortfolio();
        }
    });
});

function calculatePortfolio() {
    const stock = parseFloat(document.getElementById('stock').value) || 0;
    const bond = parseFloat(document.getElementById('bond').value) || 0;
    const gold = parseFloat(document.getElementById('gold').value) || 0;
    const cash = parseFloat(document.getElementById('cash').value) || 0;

    const total = stock + bond + gold + cash;

    if (total === 0) {
        alert('请输入至少一项资产金额');
        return;
    }

    const assets = [
        { name: '股票', value: stock, color: '#3b82f6' },
        { name: '债券', value: bond, color: '#10b981' },
        { name: '黄金', value: gold, color: '#f59e0b' },
        { name: '现金', value: cash, color: '#8b5cf6' }
    ];

    // 显示结果区域
    document.getElementById('results').style.display = 'block';
    document.getElementById('totalAssets').textContent = total.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // 更新饼图
    updatePieChart(assets);

    // 更新配置表格
    updateAllocationTable(assets, total);

    // 检查是否需要再平衡
    checkRebalanceNeeded(assets, total);

    // 滚动到结果区域
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function updatePieChart(assets) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    const isDark = document.body.classList.contains('dark-mode');

    if (pieChart) {
        pieChart.destroy();
    }

    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: assets.map(a => a.name),
            datasets: [{
                data: assets.map(a => a.value),
                backgroundColor: assets.map(a => a.color),
                borderWidth: 2,
                borderColor: isDark ? '#0f1419' : '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 14
                        },
                        padding: 15,
                        color: isDark ? '#e0e0e0' : '#333'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(2);
                            return `${label}: ¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateChartColors() {
    if (!pieChart) return;
    
    const isDark = document.body.classList.contains('dark-mode');
    pieChart.options.plugins.legend.labels.color = isDark ? '#e0e0e0' : '#333';
    pieChart.data.datasets[0].borderColor = isDark ? '#0f1419' : '#fff';
    pieChart.update();
}

function updateAllocationTable(assets, total) {
    const tbody = document.getElementById('allocationBody');
    tbody.innerHTML = '';

    assets.forEach(asset => {
        const percentage = (asset.value / total * 100).toFixed(2);
        const targetPercentage = 25;
        const deviation = Math.abs(percentage - targetPercentage);
        
        let status = '✓ 正常';
        let statusClass = 'status-ok';
        
        if (percentage > 35) {
            status = '⚠️ 超配';
            statusClass = 'status-danger';
        } else if (percentage < 15) {
            status = '⚠️ 低配';
            statusClass = 'status-danger';
        } else if (deviation > 5) {
            status = '⚡ 偏离';
            statusClass = 'status-warning';
        }

        const row = `
            <tr>
                <td>${asset.name}</td>
                <td>¥${asset.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                <td>${percentage}%</td>
                <td>25%</td>
                <td class="${statusClass}">${status}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function checkRebalanceNeeded(assets, total) {
    const needsRebalance = assets.some(asset => {
        const percentage = (asset.value / total * 100);
        return percentage > 35 || percentage < 15;
    });

    const alertDiv = document.getElementById('rebalanceAlert');
    const planDiv = document.getElementById('rebalancePlan');

    if (needsRebalance) {
        alertDiv.style.display = 'block';
        planDiv.style.display = 'block';
        generateRebalancePlan(assets, total);
    } else {
        alertDiv.style.display = 'none';
        planDiv.style.display = 'none';
    }
}

function generateRebalancePlan(assets, total) {
    const tbody = document.getElementById('rebalanceBody');
    tbody.innerHTML = '';

    const targetAmount = total / 4;

    assets.forEach(asset => {
        const difference = targetAmount - asset.value;
        const absDiff = Math.abs(difference);
        
        let action = '持有';
        let actionClass = 'action-hold';
        let actionText = '-';
        
        if (absDiff > 1) { // 忽略小于1元的调整
            if (difference > 0) {
                action = '买入';
                actionClass = 'action-buy';
                actionText = `+¥${absDiff.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
            } else {
                action = '卖出';
                actionClass = 'action-sell';
                actionText = `-¥${absDiff.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
            }
        }

        const row = `
            <tr>
                <td>${asset.name}</td>
                <td>¥${targetAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                <td class="${actionClass}">${actionText}</td>
                <td class="${actionClass}">${action}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}
