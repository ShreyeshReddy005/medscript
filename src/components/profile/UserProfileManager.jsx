import React, { useState, useEffect } from "react";
import { User, FamilyMember } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  X, 
  User as UserIcon, 
  Users, 
  Phone, 
  Calendar, 
  Heart, 
  AlertTriangle, 
  Save, 
  Edit3, 
  Trash2, 
  Plus,
  Loader
} from "lucide-react";

export default function UserProfileManager({ onClose }) {
  const [userProfile, setUserProfile] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const [me, members] = await Promise.all([
        User.me(),
        FamilyMember.list("-created_date")
      ]);
      setUserProfile(me);
      setFamilyMembers(members);
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (profileData) => {
    setSaving(true);
    try {
      await User.updateMe(profileData);
      setUserProfile({ ...userProfile, ...profileData });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFamilyMember = async (memberData) => {
    setSaving(true);
    try {
      if (editingMember) {
        await FamilyMember.update(editingMember.id, memberData);
        setFamilyMembers(prev => prev.map(m => 
          m.id === editingMember.id ? { ...m, ...memberData } : m
        ));
      } else {
        const newMember = await FamilyMember.create(memberData);
        setFamilyMembers(prev => [newMember, ...prev]);
      }
      setEditingMember(null);
      setShowAddMember(false);
    } catch (error) {
      console.error("Error saving family member:", error);
      alert("Failed to save family member. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFamilyMember = async (member) => {
    if (window.confirm(`Are you sure you want to delete ${member.full_name}'s profile? This will also delete all their medical records.`)) {
      try {
        await FamilyMember.delete(member.id);
        setFamilyMembers(prev => prev.filter(m => m.id !== member.id));
      } catch (error) {
        console.error("Error deleting family member:", error);
        alert("Failed to delete family member. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-2xl font-bold text-gray-900">Profile Management</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* My Profile Section */}
          <MyProfileSection 
            profile={userProfile} 
            onSave={handleSaveProfile} 
            saving={saving}
          />

          {/* Family Profiles Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-xl">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Family Profiles</h3>
              </div>
              <Button
                onClick={() => setShowAddMember(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Member</span>
              </Button>
            </div>

            {familyMembers.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-2xl">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No family members added yet</p>
                <p className="text-sm text-gray-500">Add family members to manage their health records</p>
              </div>
            ) : (
              <div className="space-y-4">
                {familyMembers.map(member => (
                  <FamilyMemberCard
                    key={member.id}
                    member={member}
                    onEdit={() => setEditingMember(member)}
                    onDelete={() => handleDeleteFamilyMember(member)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Family Member Modal */}
        {(showAddMember || editingMember) && (
          <FamilyMemberForm
            member={editingMember}
            onSave={handleSaveFamilyMember}
            onCancel={() => {
              setShowAddMember(false);
              setEditingMember(null);
            }}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

// My Profile Section Component
function MyProfileSection({ profile, onSave, saving }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(profile || {});

  useEffect(() => {
    setFormData(profile || {});
  }, [profile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setEditMode(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <UserIcon className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">My Profile</h3>
        </div>
        {!editMode && (
          <Button variant="ghost" onClick={() => setEditMode(true)}>
            <Edit3 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {editMode ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={formData.full_name || ''}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label>Preferred Name</Label>
              <Input
                value={formData.preferred_name || ''}
                onChange={(e) => setFormData({...formData, preferred_name: e.target.value})}
                placeholder="How you'd like to be addressed"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="Your phone number"
              />
            </div>
            <div>
              <Label>Emergency Contact</Label>
              <Input
                value={formData.emergency_contact || ''}
                onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                placeholder="Emergency contact number"
              />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={formData.date_of_birth || ''}
                onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label>Known Allergies</Label>
            <Textarea
              value={formData.allergies?.join(', ') || ''}
              onChange={(e) => setFormData({
                ...formData, 
                allergies: e.target.value.split(',').map(a => a.trim()).filter(Boolean)
              })}
              placeholder="List any allergies, separated by commas"
              rows={2}
            />
          </div>

          <div>
            <Label>Medical Conditions</Label>
            <Textarea
              value={formData.medical_conditions?.join(', ') || ''}
              onChange={(e) => setFormData({
                ...formData,
                medical_conditions: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
              })}
              placeholder="List chronic conditions, separated by commas"
              rows={2}
            />
          </div>

          <div className="flex space-x-3">
            <Button type="submit" disabled={saving} className="flex items-center space-x-2">
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProfileField icon={UserIcon} label="Name" value={profile?.full_name || 'Not set'} />
            <ProfileField icon={Phone} label="Phone" value={profile?.phone || 'Not set'} />
            <ProfileField icon={Calendar} label="Birth Date" value={profile?.date_of_birth || 'Not set'} />
            <ProfileField icon={Phone} label="Emergency Contact" value={profile?.emergency_contact || 'Not set'} />
          </div>
          {profile?.allergies?.length > 0 && (
            <ProfileField icon={AlertTriangle} label="Allergies" value={profile.allergies.join(', ')} />
          )}
          {profile?.medical_conditions?.length > 0 && (
            <ProfileField icon={Heart} label="Medical Conditions" value={profile.medical_conditions.join(', ')} />
          )}
        </div>
      )}
    </div>
  );
}

// Family Member Card Component
function FamilyMemberCard({ member, onEdit, onDelete }) {
  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      pink: 'bg-pink-100 text-pink-700 border-pink-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      red: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className={`p-4 rounded-2xl border-2 ${getColorClasses(member.profile_color)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className="text-lg font-bold">{member.full_name}</h4>
            <span className="px-2 py-1 bg-white/50 rounded-full text-xs font-medium">
              {member.relation_to_user}
            </span>
          </div>
          
          <div className="space-y-1 text-sm opacity-80">
            {member.date_of_birth && (
              <p>Born: {new Date(member.date_of_birth).toLocaleDateString()}</p>
            )}
            {member.allergies?.length > 0 && (
              <p>Allergies: {member.allergies.join(', ')}</p>
            )}
            {member.medical_conditions?.length > 0 && (
              <p>Conditions: {member.medical_conditions.join(', ')}</p>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Family Member Form Component
function FamilyMemberForm({ member, onSave, onCancel, saving }) {
  const [formData, setFormData] = useState({
    full_name: '',
    relation_to_user: '',
    date_of_birth: '',
    gender: '',
    allergies: [],
    medical_conditions: [],
    emergency_contact: '',
    notes: '',
    profile_color: 'blue',
    ...member
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.relation_to_user) {
      alert('Please fill in the required fields.');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">
            {member ? 'Edit Family Member' : 'Add Family Member'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <Label>Relationship *</Label>
            <Select
              value={formData.relation_to_user}
              onValueChange={(value) => setFormData({...formData, relation_to_user: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Child">Child</SelectItem>
                <SelectItem value="Spouse">Spouse</SelectItem>
                <SelectItem value="Parent">Parent</SelectItem>
                <SelectItem value="Sibling">Sibling</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({...formData, gender: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Profile Color</Label>
            <div className="flex space-x-2 mt-2">
              {['blue', 'green', 'purple', 'pink', 'orange', 'red'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({...formData, profile_color: color})}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.profile_color === color ? 'border-gray-800' : 'border-gray-300'
                  } bg-${color}-500`}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Known Allergies</Label>
            <Textarea
              value={formData.allergies?.join(', ') || ''}
              onChange={(e) => setFormData({
                ...formData,
                allergies: e.target.value.split(',').map(a => a.trim()).filter(Boolean)
              })}
              placeholder="List allergies, separated by commas"
              rows={2}
            />
          </div>

          <div>
            <Label>Medical Conditions</Label>
            <Textarea
              value={formData.medical_conditions?.join(', ') || ''}
              onChange={(e) => setFormData({
                ...formData,
                medical_conditions: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
              })}
              placeholder="List conditions, separated by commas"
              rows={2}
            />
          </div>

          <div>
            <Label>Emergency Contact</Label>
            <Input
              value={formData.emergency_contact}
              onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
              placeholder="Emergency contact number"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any additional notes"
              rows={2}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Profile Field Component
function ProfileField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center space-x-3">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}