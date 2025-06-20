"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { LayoutDashboard, MapPin, LogIn, LogOut, User, Shield, Cpu, Network, Book, Joystick, Server } from "lucide-react"
import Image from "next/image"
import { LOCATIONS } from "@/types/inventory"

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout, isAdmin } = useAuth()

  const navigationItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
  ]

  const locationIconMap: Record<string, React.ElementType> = {
    // "Ruang Laboran": FlaskConical, // Removed FlaskConical, optionally replace with another icon if needed
    "Lab FKI": Cpu,
    "Lab Jarkom": Network,
    "Lab SI": Book,
    "Lab SIC": Joystick,
    "Lab RPL": Server,
  }

  const locationItems = LOCATIONS.map((location) => ({
    title: location,
    url: `/location/${encodeURIComponent(location)}`,
    icon: locationIconMap[location] || MapPin,
  }))

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <Image src="/logoUMS.png" alt="Logo UMS" width={32} height={32} className="h-8 w-8 object-contain" />
          <div>
            <p className="font-semibold text-sm">Inventaris Lab</p>
            <p className="text-xs text-white">Teknik Informatika</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigasi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ruangan</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {locationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4 text-white" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          {isAdmin ? (
            <>
              <SidebarMenuItem>
                <div className="flex items-center gap-2 px-2 py-2 text-sm">
                  <Shield className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium">{user?.username}</p>
                    <p className="text-xs text-green-600">Administrator</p>
                  </div>
                </div>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} className="w-full">
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          ) : (
            <>
              <SidebarMenuItem>
                <div className="flex items-center gap-2 px-2 py-2 text-sm">
                  <User className="h-6 w-6 text-yellow-500" />
                  <div>
                    <p className="font-medium">Mode Pengunjung</p>
                    <p className="text-xs text-white">Read Only</p>
                  </div>
                </div>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="w-full">
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                    <span>Login sebagai Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
