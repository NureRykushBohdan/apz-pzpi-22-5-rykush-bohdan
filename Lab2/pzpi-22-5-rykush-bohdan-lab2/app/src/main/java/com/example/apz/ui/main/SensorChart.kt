// Файл: app/src/main/java/com/example/apz/ui/main/SensorChart.kt
package com.example.apz.ui.main

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.patrykandpatrick.vico.compose.axis.horizontal.rememberBottomAxis
import com.patrykandpatrick.vico.compose.axis.vertical.rememberStartAxis
import com.patrykandpatrick.vico.compose.chart.Chart
import com.patrykandpatrick.vico.compose.chart.line.lineChart
import com.patrykandpatrick.vico.core.axis.AxisPosition
import com.patrykandpatrick.vico.core.axis.formatter.AxisValueFormatter
import com.patrykandpatrick.vico.core.entry.ChartEntryModelProducer
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

// Спеціальний форматер, який ми створюємо у ViewModel
class DateTimeAxisValueFormatter(private val timestamps: List<LocalDateTime>) :
    AxisValueFormatter<AxisPosition.Horizontal.Bottom> {
    private val formatter = DateTimeFormatter.ofPattern("HH:mm")
    override fun formatValue(value: Float, chartValues: com.patrykandpatrick.vico.core.chart.values.ChartValues): String {
        return timestamps.getOrNull(value.toInt())?.format(formatter) ?: ""
    }
}

@Composable
fun SensorHistoryChart(chartData: ChartData, chartTitle: String, dataKey: String) {
    val chartModelProducer = ChartEntryModelProducer(chartData.entries)
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Text(text = chartTitle, style = MaterialTheme.typography.titleMedium)
        Chart(
            modifier = Modifier.height(200.dp),
            chart = lineChart(),
            chartModelProducer = chartModelProducer,
            startAxis = rememberStartAxis(title = dataKey.uppercase()),
            bottomAxis = rememberBottomAxis(
                title = "Час",
                valueFormatter = chartData.horizontalAxisValueFormatter,
                guideline = null
            )
        )
    }
}