import { useState, useEffect } from 'react'
import { getUsers, createUser, updateUser, deleteUser, setUserStatus } from '../api'
import { UserPlus, Trash2, Edit2, X, Shield, User, Check, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function Users() {
  const [users, setUsers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ username: '', password: '', role: 'vip' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    try {
      const active = await getUsers('active')
      setUsers(active.users || [])
    } catch (e) {
      setError(e.message)
    }
    try {
      const pending = await getUsers('pending')
      setPendingUsers(pending.users || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createUser(form.username, form.password, form.role)
      setShowForm(false)
      setForm({ username: '', password: '', role: 'vip' })
      await loadUsers()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const data = {}
      if (form.password) data.password = form.password
      if (form.role) data.role = form.role
      await updateUser(editing, data)
      setEditing(null)
      setForm({ username: '', password: '', role: 'vip' })
      await loadUsers()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async (username) => {
    if (!confirm(`Delete user "${username}"?`)) return
    try {
      await deleteUser(username)
      await loadUsers()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleApprove = async (username) => {
    try {
      setError('')
      setSuccess('')
      await setUserStatus(username, 'active')
      await loadUsers()
      setSuccess(`"${username}" approved and moved to Active`)
      setTab('active')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleReject = async (username) => {
    try {
      setError('')
      setSuccess('')
      await setUserStatus(username, 'rejected')
      await loadUsers()
      setSuccess(`"${username}" rejected`)
    } catch (e) {
      setError(e.message)
    }
  }

  const startEdit = (user) => {
    setEditing(user.username)
    setForm({ username: user.username, password: '', role: user.role })
    setShowForm(false)
  }

  const list = tab === 'active' ? users : pendingUsers

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6 text-accent" /> Users
        </h1>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ username: '', password: '', role: 'vip' }) }}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-surface rounded-lg hover:bg-accent/90 transition">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">{error}</div>}
      {success && <div className="mb-4 p-3 bg-[#FFD600]/10 border border-[#FFD600]/30 text-[#FFD600] rounded-lg">{success}</div>}

      <div className="flex mb-6 border border-gray-700 rounded-lg overflow-hidden">
        <button onClick={() => setTab('active')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'active' ? 'bg-accent text-surface' : 'bg-surface-light text-gray-400 hover:text-white'}`}>
          Active ({users.length})
        </button>
        <button onClick={() => setTab('pending')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'pending' ? 'bg-accent text-surface' : 'bg-surface-light text-gray-400 hover:text-white'}`}>
          Pending ({pendingUsers.length})
        </button>
      </div>

      {(showForm || editing) && (
        <form onSubmit={editing ? handleUpdate : handleCreate} className="mb-6 p-4 bg-surface-light rounded-xl border border-white/5">
          <h3 className="text-lg font-semibold mb-4">{editing ? `Edit User: ${editing}` : 'New User'}</h3>
          {!editing && (
            <div className="mb-3">
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                     className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent" required />
            </div>
          )}
          <div className="mb-3">
            <label className="block text-sm text-gray-400 mb-1">{editing ? 'New Password (leave blank to keep)' : 'Password'}</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                   className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                   required={!editing} />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent">
              <option value="regular">Regular</option>
              <option value="vip">VIP</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-accent text-surface rounded-lg hover:bg-accent/90 transition">
              <Check className="w-4 h-4" /> {editing ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {tab === 'active' ? 'No active users.' : 'No pending registrations.'}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((user) => (
            <div key={user.username} className="flex items-center justify-between p-4 bg-surface-light rounded-xl border border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user.username}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : user.role === 'vip' ? 'bg-accent/20 text-accent' : 'bg-gray-500/20 text-gray-400'}`}>
                    {user.role}
                  </span>
                  {tab === 'pending' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> pending
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Created: {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {tab === 'pending' ? (
                  <>
                    <button onClick={() => handleApprove(user.username)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#FFD600]/20 text-[#FFD600] rounded-lg hover:bg-[#FFD600]/30 transition text-sm">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => handleReject(user.username)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(user)}
                            className="p-2 text-gray-400 hover:text-accent transition rounded-lg hover:bg-white/5">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(user.username)}
                            className="p-2 text-gray-400 hover:text-red-400 transition rounded-lg hover:bg-white/5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}