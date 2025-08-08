"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { EnergyChart } from "@/components/energy-chart"
import { MonthlyChart } from "@/components/monthly-chart"
import { Zap, Power, Activity, DollarSign, Plug, PlugZap } from 'lucide-react'

// Mock data for demonstration
const mockLiveData = {
  current: 2.3,
  power: 520,
  energy: 15.847,
  bill: 89.45
}

export default function Dashboard() {
  const [liveData, setLiveData] = useState(mockLiveData)
  const [isConnected, setIsConnected] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => ({
        current: prev.current + (Math.random() - 0.5) * 0.2,
        power: prev.power + (Math.random() - 0.5) * 50,
        energy: prev.energy + Math.random() * 0.001,
        bill: prev.bill + Math.random() * 0.01
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const toggleConnection = () => {
    setIsConnected(!isConnected)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Smart Energy Meter</h1>
                <p className="text-sm text-muted-foreground">Real-time energy monitoring</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Live Data Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Live Data</h2>
            <p className="text-muted-foreground">Real-time energy consumption metrics</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{liveData.current.toFixed(1)} A</div>
                <p className="text-xs text-muted-foreground">Electrical current flow</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Power</CardTitle>
                <Power className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(liveData.power)} W</div>
                <p className="text-xs text-muted-foreground">Instantaneous power usage</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Energy</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{liveData.energy.toFixed(3)} kWh</div>
                <p className="text-xs text-muted-foreground">Total energy consumed</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Bill</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₪ {liveData.bill.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Accumulated charges</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Controls Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Controls</h2>
            <p className="text-muted-foreground">Manage your electricity connection</p>
          </div>

          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {isConnected ? (
                  <Plug className="h-5 w-5 text-green-500" />
                ) : (
                  <PlugZap className="h-5 w-5 text-red-500" />
                )}
                <span>Electricity Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Connection Status:</span>
                <Badge variant={isConnected ? "default" : "destructive"}>
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <Button 
                onClick={toggleConnection}
                variant={isConnected ? "destructive" : "default"}
                className="w-full"
              >
                {isConnected ? "Disconnect Electricity" : "Connect Electricity"}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Charts Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
            <p className="text-muted-foreground">Energy consumption patterns and billing history</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Daily Energy Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Energy Consumption</CardTitle>
                <div className="space-y-2">
                  <Label htmlFor="date-picker">Select Date</Label>
                  <Input
                    id="date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <EnergyChart selectedDate={selectedDate} />
              </CardContent>
            </Card>

            {/* Monthly Bills Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Bills</CardTitle>
                <div className="space-y-2">
                  <Label htmlFor="year-picker">Select Year</Label>
                  <Input
                    id="year-picker"
                    type="number"
                    min="2020"
                    max="2030"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <MonthlyChart selectedYear={selectedYear} />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}
