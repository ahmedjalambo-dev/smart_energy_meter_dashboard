"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

interface EnergyChartProps {
  selectedDate: string
}

export function EnergyChart({ selectedDate }: EnergyChartProps) {
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

        // Generate mock data for 24 hours
        const hourlyData = Array.from({ length: 24 }, (_, i) => {
          return Math.random() * 2 + Math.sin(i / 24 * Math.PI * 2) * 0.5 + 1
        })

        const isDark = theme === 'dark'
        const textColor = isDark ? '#e5e7eb' : '#374151'
        const gridColor = isDark ? '#374151' : '#e5e7eb'

        chartRef.current = new Chart(ctx!, {
          type: 'bar',
          data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{
              label: 'Energy (kWh)',
              data: hourlyData,
              backgroundColor: 'hsl(var(--primary) / 0.6)',
              borderColor: 'hsl(var(--primary))',
              borderWidth: 1,
              borderRadius: 4,
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
                  text: 'Energy (kWh)',
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
                  text: 'Hour of Day',
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
  }, [selectedDate, theme])

  return (
    <div className="h-[300px] w-full">
      <canvas ref={canvasRef} />
    </div>
  )
}
