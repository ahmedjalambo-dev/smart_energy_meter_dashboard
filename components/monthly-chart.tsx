"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

interface MonthlyChartProps {
  selectedYear: number
}

export function MonthlyChart({ selectedYear }: MonthlyChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<any>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const loadChart = async () => {
      const Chart = (await import('chart.js/auto')).default
      
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        
        // Destroy existing chart
        if (chartRef.current) {
          chartRef.current.destroy()
        }

        // Generate mock data for 12 months
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
          return Math.random() * 200 + 50 + (i * 10)
        })

        const isDark = theme === 'dark'
        const textColor = isDark ? '#e5e7eb' : '#374151'
        const gridColor = isDark ? '#374151' : '#e5e7eb'

        chartRef.current = new Chart(ctx!, {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
              label: 'Bill (₪)',
              data: monthlyData,
              backgroundColor: 'hsl(var(--primary) / 0.1)',
              borderColor: 'hsl(var(--primary))',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: 'hsl(var(--primary))',
              pointBorderColor: 'hsl(var(--background))',
              pointBorderWidth: 2,
              pointRadius: 4,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: textColor
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Bill Amount (₪)',
                  color: textColor
                },
                ticks: {
                  color: textColor
                },
                grid: {
                  color: gridColor
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Month',
                  color: textColor
                },
                ticks: {
                  color: textColor
                },
                grid: {
                  color: gridColor
                }
              }
            }
          }
        })
      }
    }

    loadChart()

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }
    }
  }, [selectedYear, theme])

  return (
    <div className="h-[300px] w-full">
      <canvas ref={canvasRef} />
    </div>
  )
}
