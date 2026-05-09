import React, { useState, useEffect } from "react";
import { Copy, Plus, Trash2, Key, Check, AlertCircle, Eye, EyeOff, Search } from "lucide-react";

type KeyType = 'publishable' | 'secret';
type KeyStatus = 'active' | 'expired' | 'revoked';
type Environment = 'test' | 'live';

interface ApiKey {
  id: string;
  name: string;
  token: string;
  maskedToken: string;
  type: KeyType;
  environment: Environment;
  status: KeyStatus;
  scopes: string[];
  createdAt: Date;
  expiresAt?: Date;
  viewable: boolean;
}

const parseDateString = (days: '7' | '30' | '90' | 'no') => {
  if (days === 'no') return undefined;
  const d = new Date();
  d.setDate(d.getDate() + parseInt(days));
  return d;
};

export default function App() {
  const [keys, setKeys] = useState<ApiKey[]>([
    {
      id: "1",
      name: "Production Server",
      token: "sk_live_1234567890abcdef",
      maskedToken: "sk_live_••••••••cdef",
      type: "secret",
      environment: "live",
      status: "active",
      scopes: ["read", "write"],
      createdAt: new Date(),
      viewable: false
    },
    {
      id: "2",
      name: "SDK Key",
      token: "pk_test_abcdef1234567890",
      maskedToken: "pk_test_••••••••7890",
      type: "publishable",
      environment: "test",
      status: "active",
      scopes: ["read"],
      createdAt: new Date(Date.now() - 86400000 * 5),
      viewable: true
    }
  ]);

  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [showModal, setShowModal] = useState(false);
  const [successKey, setSuccessKey] = useState<ApiKey | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [keyType, setKeyType] = useState<KeyType>("secret");
  const [environment, setEnvironment] = useState<Environment>("live");
  const [expiresIn, setExpiresIn] = useState<'7' | '30' | '90' | 'no'>('no');
  const [scopes, setScopes] = useState<string[]>(['read']);
  
  const [copiedObj, setCopiedObj] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedObj(text);
    setTimeout(() => setCopiedObj(null), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const tokenStr = `${keyType === 'secret' ? 'sk' : 'pk'}_${environment}_${Math.random().toString(36).substring(2, 12)}` + Math.random().toString(36).substring(2, 6);
    
    const newKey: ApiKey = {
      id: Math.random().toString(36).substring(7),
      name: name || 'Unnamed Key',
      token: tokenStr,
      maskedToken: tokenStr.substring(0, 8) + '••••••••' + tokenStr.slice(-4),
      type: keyType,
      environment: environment,
      status: 'active',
      scopes: scopes,
      createdAt: new Date(),
      expiresAt: parseDateString(expiresIn),
      viewable: keyType === 'publishable'
    };

    setKeys([newKey, ...keys]);
    setShowModal(false);
    setSuccessKey(newKey);
    
    // Reset form
    setName("");
    setKeyType("secret");
    setEnvironment("live");
    setExpiresIn('no');
    setScopes(['read']);
  };

  const handleRevoke = (id: string) => {
    setKeys(keys.map(k => k.id === id ? { ...k, status: 'revoked' } : k));
  };

  const filteredKeys = keys.filter(k => 
    activeTab === 'active' ? (k.status === 'active' && (!k.expiresAt || k.expiresAt > new Date())) : (k.status !== 'active' || (k.expiresAt && k.expiresAt < new Date()))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <Key className="w-6 h-6" />
            <h1 className="text-xl font-bold">API Keys Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">API Keys</h2>
            <p className="text-slate-500 mt-1">Manage your API keys for authentication and access control.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create new key
          </button>
        </div>

        {/* Success Alert */}
        {successKey && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8 relative">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-100 p-2 rounded-full">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-emerald-900">API key created successfully</h3>
                <p className="text-emerald-700 mt-1 mb-4">
                  {successKey.type === 'secret' 
                    ? "Please copy this secret key now. You won't be able to see it again!"
                    : "This publishable key has been created."}
                </p>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={successKey.token}
                    className="w-full max-w-md bg-white border border-emerald-200 rounded-md px-3 py-2 text-sm font-mono text-emerald-900"
                  />
                  <button 
                    onClick={() => handleCopy(successKey.token)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {copiedObj === successKey.token ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setSuccessKey(null)}
              className="absolute top-4 right-4 text-emerald-500 hover:text-emerald-700"
            >
              Close
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 flex">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'active' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Active Keys
            </button>
            <button
              onClick={() => setActiveTab('inactive')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inactive' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Inactive Keys
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left bg-white">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Token</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredKeys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No API keys found.
                    </td>
                  </tr>
                ) : (
                  filteredKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{key.name}</div>
                        <div className="flex gap-1 mt-1 text-xs text-slate-500">
                          {key.scopes.map(s => <span key={s} className="bg-slate-100 px-1.5 py-0.5 rounded">{s}</span>)}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          {key.viewable ? key.token : key.maskedToken}
                          {key.viewable && (
                            <button 
                              onClick={() => handleCopy(key.token)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Copy"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          key.type === 'publishable' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {key.type}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 ml-1 uppercase">{key.environment}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          key.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {key.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {key.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {key.type === 'secret' && key.status === 'active' && (
                          <button 
                            onClick={() => handleRevoke(key.id)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Key Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">Create new API key</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Production Server"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Key Type</label>
                  <select 
                    value={keyType}
                    onChange={e => setKeyType(e.target.value as KeyType)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none bg-white"
                  >
                    <option value="secret">Secret</option>
                    <option value="publishable">Publishable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Environment</label>
                  <select 
                    value={environment}
                    onChange={e => setEnvironment(e.target.value as Environment)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none bg-white"
                  >
                    <option value="live">Live</option>
                    <option value="test">Test</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Expiration</label>
                <select 
                  value={expiresIn}
                  onChange={e => setExpiresIn(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none bg-white"
                >
                  <option value="no">No expiration</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Scopes</label>
                <div className="space-y-2">
                  {['read', 'write', 'admin'].map(scope => (
                    <label key={scope} className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={scopes.includes(scope)}
                        onChange={(e) => {
                          if (e.target.checked) setScopes([...scopes, scope]);
                          else setScopes(scopes.filter(s => s !== scope));
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                      />
                      <span className="text-sm font-mono text-slate-600">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Create key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
