import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Edit, Trash2, X, Lock, User, Mail, ShieldAlert, Camera } from 'lucide-react';
import { AdminUser, GeneralSettings } from '../../types/admin';
import { readProfileImage } from '../../services/profileImage';

interface UserManagementTabProps {
  users: AdminUser[];
  generalSettings: GeneralSettings;
  onUpdateGeneralSettings: (settings: Partial<GeneralSettings>) => Promise<void>;
  onSaveUser: (user: Partial<AdminUser> & { password?: string }) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  users,
  generalSettings,
  onUpdateGeneralSettings,
  onSaveUser,
  onDeleteUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [role, setRole] = useState<'Administrator' | 'Editor' | 'Subscriber'>('Subscriber');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');

  const openAddModal = () => {
    setEditingUser(null);
    setDisplayName('');
    setUsername('');
    setEmail('');
    setAvatar('');
    setPassword('');
    setFormError('');
    setRole('Subscriber');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (u: AdminUser) => {
    setEditingUser(u);
    setDisplayName(u.displayName || u.username);
    setUsername(u.username);
    setEmail(u.email);
    setAvatar(u.avatar || '');
    setPassword('');
    setFormError('');
    setRole(u.role);
    setStatus(u.status);
    setIsModalOpen(true);
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAvatar(await readProfileImage(file));
      setFormError('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not load profile image.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) return;

    try {
      await onSaveUser({
        id: editingUser?.id,
        displayName: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
        avatar,
        role,
        status,
        ...(password ? { password } : {})
      });
      setIsModalOpen(false);
    } catch (error: any) {
      setFormError(error.message || 'Could not save account.');
    }
  };

  return (
    <div className="space-y-6 text-xs text-[#e9ecef]">
      
      {/* Top Access Toggles */}
      <div className="bg-[#242832] border border-[#2e3442] rounded-3xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] flex items-center justify-between">
          <div>
            <div className="font-bold text-white text-sm">Public User Registration</div>
            <p className="text-[11px] text-[#b2b1ad] mt-0.5">
              Allow visitors to register new accounts. If disabled, only existing users can log in.
            </p>
          </div>
          <input
            type="checkbox"
            checked={generalSettings.registrationEnabled}
            onChange={(e) => onUpdateGeneralSettings({ registrationEnabled: e.target.checked })}
            className="w-5 h-5 accent-[#db6937] rounded cursor-pointer"
          />
        </div>

        <div className="p-4 rounded-2xl bg-[#1a1c23] border border-[#343b4a] flex items-center justify-between">
          <div>
            <div className="font-bold text-white text-sm">Guest Browsing & Playback</div>
            <p className="text-[11px] text-[#b2b1ad] mt-0.5">
              Allow unauthorized visitors to stream content without signing into an account.
            </p>
          </div>
          <input
            type="checkbox"
            checked={generalSettings.guestBrowsingEnabled}
            onChange={(e) => onUpdateGeneralSettings({ guestBrowsingEnabled: e.target.checked })}
            className="w-5 h-5 accent-[#db6937] rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Users List Table */}
      <div className="bg-[#242832] border border-[#2e3442] rounded-3xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-[#2e3442] flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#4f83d3]" />
              <span>Registered Users & Administrative Roles</span>
            </h3>
            <span className="text-[11px] text-[#b2b1ad]">Total accounts: {users.length}</span>
          </div>

          <button
            onClick={openAddModal}
            className="bg-gradient-flixer hover:opacity-95 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create User</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#b2b1ad]">
            <thead className="bg-[#1e2129] text-[11px] uppercase tracking-wider text-[#e9ecef] border-b border-[#2e3442]">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2129]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#1f232c] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'}
                        alt={u.username}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover shadow"
                      />
                      <span>
                        <span className="block font-semibold text-white">{u.displayName || u.username}</span>
                        <span className="block text-[10px] text-[#858b98]">@{u.username}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white font-mono">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      u.role === 'Administrator' 
                        ? 'bg-[#db6937]/20 text-[#db6937]' 
                        : u.role === 'Editor'
                        ? 'bg-[#4f83d3]/20 text-[#4f83d3]'
                        : 'bg-[#242832] text-[#b2b1ad]'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      u.status === 'active' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#b2b1ad]">{u.lastLogin}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 rounded-lg bg-[#1a1c23] hover:bg-[#343b4a] text-[#4f83d3] hover:text-white"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove user "${u.username}"?`)) {
                              onDeleteUser(u.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-[#1a1c23] hover:bg-rose-950/60 text-rose-400 hover:text-rose-200"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-h-[90vh] overflow-y-auto bg-[#242832] border border-[#3e4555] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e3442]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#db6937]" />
                <span>{editingUser ? `Edit User: ${editingUser.username}` : 'Add New User'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-white">Display Name *</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-white">Username *</label>
                <input
                  type="text"
                  required
                  maxLength={64}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-white">
                  {editingUser ? 'Set new password (optional, 12+ characters)' : 'Initial Password * (12+ characters)'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  minLength={password ? 12 : undefined}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-white">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-white">Profile Photo</label>
                <div className="flex items-center gap-3">
                  <img
                    src={avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'}
                    alt="User profile preview"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#3e4555] bg-[#1a1c23] px-3 py-2 text-xs text-white hover:border-[#4f83d3]">
                    <Camera className="h-4 w-4" /> Upload photo
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>
                <p className="text-[10px] text-[#858b98]">JPG, PNG, WebP or GIF; up to 500 KB.</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-white">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                >
                  <option value="Subscriber">Subscriber (Standard User)</option>
                  <option value="Editor">Editor (Content Manager)</option>
                  <option value="Administrator">Administrator (Full Access)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-white">Account Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-white"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended / Blocked</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2e3442]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1a1c23] text-[#b2b1ad] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-flixer text-white font-bold shadow hover:opacity-95"
                >
                  {editingUser ? 'Save User' : 'Create User'}
                </button>
              </div>
              {formError && <p className="text-rose-400" role="alert">{formError}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
