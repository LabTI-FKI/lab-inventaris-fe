"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useEffect } from "react"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { LayoutDashboard, MapPin, LogIn, LogOut, User, Shield, Building, Cpu, Network, Computer, Joystick, Braces, Users, Wrench, Coffee } from "lucide-react"
import Image from "next/image"
import useRooms, { Room } from "@/hooks/use-rooms"

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout, isAdmin } = useAuth()
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  // Auto-collapse on mobile, auto-expand on desktop
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768
      if (isMobile && state === "expanded") {
        toggleSidebar()
      } else if (!isMobile && state === "collapsed") {
        toggleSidebar()
      }
    }

    // Check on mount
    handleResize()

    // Listen for resize
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [state, toggleSidebar])

  const navigationItems = isAdmin
    ? [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Manajemen Ruangan",
          url: "/rooms",
          icon: Building,
        },
      ]
    : [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
      ]

  const locationIconMap: Record<string, React.ElementType> = {
    "Ruang Laboran": Building,
    "Lab FKI": Cpu,
    "Lab Jarkom": Network,
    "Lab SI": Computer,
    "Lab SIC": Joystick,
    "Lab RPL": Braces,
  }

  // Allowed icon keys mapped to components
  const ICON_COMPONENTS: Record<string, React.ElementType> = {
    Building,
    Cpu,
    Network,
    Computer,
    Joystick,
    Braces,
    Users,
    Wrench,
    Coffee,
  }

  // Include saved rooms from localStorage (merged)
  const { getAll: getAllRooms } = useRooms()
  const mergedRooms = getAllRooms()
  type DefaultRoom = { id: string; name: string }
  const isSavedRoom = (obj: unknown): obj is Room => {
    return typeof obj === "object" && obj !== null && "id" in obj && "name" in obj
  }

  const savedLocationItems = mergedRooms.map((r) => {
    const title = (r as DefaultRoom).name
    const id = (r as DefaultRoom).id

    let iconVar: React.ElementType = MapPin
    if (isSavedRoom(r) && r.icon && ICON_COMPONENTS[r.icon]) {
      iconVar = ICON_COMPONENTS[r.icon]
    } else if (locationIconMap[title]) {
      iconVar = locationIconMap[title]
    }

    return {
      title,
      url: `/location/${encodeURIComponent(title)}`,
      icon: iconVar,
      id,
    }
  })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <Image src="/logoUMS.png" alt="Logo UMS" width={32} height={32} className="h-8 w-8 object-contain" />
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="font-semibold text-sm">Inventaris Lab</p>
            <p className="text-xs text-white">Teknik Informatika</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Navigasi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={isCollapsed ? item.title : undefined}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Ruangan</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {savedLocationItems.map((item) => (
                <SidebarMenuItem key={item.id ?? item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={isCollapsed ? item.title : undefined}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4 text-white" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
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
                <div className="flex items-center gap-2 px-2 py-2 text-sm group-data-[collapsible=icon]:justify-center">
                  <Shield className="h-4 w-4 text-green-600" />
                  <div className="group-data-[collapsible=icon]:hidden">
                    <p className="font-medium">{user?.username}</p>
                    <p className="text-xs text-green-600">Administrator</p>
                  </div>
                </div>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} className="w-full" tooltip={isCollapsed ? "Log Out" : undefined}>
                  <LogOut className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          ) : (
            <>
              <SidebarMenuItem>
                <div className="flex items-center gap-2 px-2 py-2 text-sm group-data-[collapsible=icon]:justify-center">
                  <User className="h-6 w-6 text-yellow-500" />
                  <div className="group-data-[collapsible=icon]:hidden">
                    <p className="font-medium">Mode Pengunjung</p>
                    <p className="text-xs text-white">Read Only</p>
                  </div>
                </div>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="w-full" tooltip={isCollapsed ? "Login" : undefined}>
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Login sebagai Admin</span>
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
