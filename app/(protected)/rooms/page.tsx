"use client"

import React, { useState } from "react"
import useRooms from "@/hooks/use-rooms"
import { Building, Cpu, Network, Computer, Joystick, Braces, Plus, Edit2, Trash2, Users, Wrench, Coffee } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const ICON_COMPONENTS: Record<string, React.ElementType> = { Building, Cpu, Network, Computer, Joystick, Braces, Users, Wrench, Coffee }
const ICON_NAMES = [
  { key: 'Building', label: 'Ruang Kantor' },
  { key: 'Cpu', label: 'Lab Komputer' },
  { key: 'Network', label: 'Lab Jarkom' },
  { key: 'Computer', label: 'Lab SI' },
  { key: 'Joystick', label: 'Game Lab' },
  { key: 'Braces', label: 'Lab RPL' },
  { key: 'Users', label: 'Ruang Rapat' },
  { key: 'Wrench', label: 'Workshop' },
  { key: 'Coffee', label: 'Pantry' }
]

interface Room {
  id: string
  name: string
  icon?: string
}

export default function RoomsPage() {
  const { getAll, create, update, remove, isLoading } = useRooms()
  
  const merged = getAll()

  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState<string | undefined>(undefined)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingOriginalName, setEditingOriginalName] = useState<string | null>(null)
  const [editingIcon, setEditingIcon] = useState<string | undefined>(undefined)

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await create({ name: newName.trim(), description: "", icon: newIcon })
      setNewName("")
      setNewIcon(undefined)
    } catch (error) {
      console.error('Failed to create room:', error)
      alert('Failed to create room. Please try again.')
    }
  }

  const startEdit = (id: string, name: string) => {
    setEditingId(id)
    setEditingName(name)
    setEditingOriginalName(name)
    // pull icon from merged list (use type guard)
    const found = merged.find((m) => m.id === id)
    if (found && "icon" in found) setEditingIcon(found.icon)
    else setEditingIcon(undefined)
  }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      if (String(editingId).startsWith("default:")) {
        // editing a default: create a saved room that replaces the default
        await create({ name: editingName, description: "", replaces_default: editingOriginalName || editingName, icon: editingIcon })
      } else {
        await update(editingId, { name: editingName, icon: editingIcon })
      }
      setEditingId(null)
      setEditingName("")
      setEditingOriginalName(null)
      setEditingIcon(undefined)
    } catch (error) {
      console.error('Failed to update room:', error)
      alert('Failed to update room. Please try again.')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus ruangan "${name}"? This will also delete all items in this room.`)) return
    try {
      if (String(id).startsWith("default:")) {
        // mark the default as hidden by creating a hidden room entry
        await create({ name, description: "", hidden: true })
      } else {
        const success = await remove(id)
        if (!success) {
          alert('Failed to delete room and its items. Please try again.')
        }
      }
    } catch (error) {
      console.error('Failed to delete room:', error)
      alert('Failed to delete room. Please try again.')
    }
  }

  return (
    <div className="p-6">
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Manajemen Ruangan</h1>
          <p className="text-gray-600 text-sm">Kelola daftar ruangan laboratorium</p>
        </div>

        {/* Create Room Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-4 w-4" />
              Tambah Ruangan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Nama Ruangan</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: Lab Jaringan"
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Pilih Ikon</label>
              <div className="grid grid-cols-3 gap-2">
                {ICON_NAMES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setNewIcon(key)}
                    className={`p-2 border rounded text-center text-xs ${
                      newIcon === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {React.createElement(ICON_COMPONENTS[key], { className: 'h-5 w-5 mx-auto mb-1' })}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Buat Ruangan
            </Button>
          </CardContent>
        </Card>

        {/* Rooms List */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Daftar Ruangan</h2>
          
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : merged.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-gray-500 text-sm">Belum ada ruangan</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {merged.map((r) => {
                const room = r as Room
                return (
                  <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {room.icon ? React.createElement(ICON_COMPONENTS[room.icon], { className: 'h-5 w-5 text-gray-600' }) : null}
                      <div>
                        <p className="font-medium text-gray-800">{room.name}</p>
                        <p className="text-xs text-gray-500">ID: {room.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(room.id, room.name)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(room.id, room.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        {editingId && (
          <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Ruangan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Nama Ruangan</label>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Pilih Ikon</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ICON_NAMES.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setEditingIcon(key)}
                        className={`p-2 border rounded text-center text-xs ${
                          editingIcon === key
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {React.createElement(ICON_COMPONENTS[key], { className: 'h-5 w-5 mx-auto mb-1' })}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveEdit} className="flex-1">Simpan</Button>
                  <Button onClick={() => setEditingId(null)} variant="outline" className="flex-1">Batal</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
