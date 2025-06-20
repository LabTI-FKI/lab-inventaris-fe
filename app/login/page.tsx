"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FlaskConical, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAdmin) {
      router.push("/dashboard")
    }
  }, [isAdmin, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const success = login(username, password)

    if (success) {
      router.push("/dashboard")
    } else {
      setError("Invalid username or password")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <FlaskConical className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Login Admin</CardTitle>
          <CardDescription>Masuk sebagai admin untuk mengelola inventaris</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nama Pengguna</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Masukkan nama pengguna admin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Masukkan kata sandi admin"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error === "Invalid username or password" ? "Nama pengguna atau kata sandi salah" : error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground" disabled={isLoading}>
              {isLoading ? "Sedang masuk..." : "Masuk sebagai Admin"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/dashboard" className="inline-flex items-center text-sm text-primary hover:text-accent">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Kembali ke Tampilan Staf
            </Link>
          </div>

          <div className="mt-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium">Akun Admin Demo:</p>
            <div className="bg-secondary p-3 rounded-md">
              <p>
                <strong>Nama Pengguna:</strong> admin
              </p>
              <p>
                <strong>Kata Sandi:</strong> admin123
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
