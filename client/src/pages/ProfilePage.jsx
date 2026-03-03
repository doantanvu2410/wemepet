import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { updateProfile } from 'firebase/auth';
import { getImageUrl, API_URL, compressImage, cropImageToSquare } from '../utils';
import EditKoiPopup from '../components/EditKoiPopup';
import { FullscreenModal, AvatarUploadPopup, AccountEditPopup, UserListPopup } from '../components/Popups';
import { useToast } from '../components/Toast';

const ProfilePage = ({ currentUser, setUser }) => {
  const { email: paramEmail } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [profileUser, setProfileUser] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [ownerItems, setOwnerItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [editingKoi, setEditingKoi] = useState(null);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewSrc, setAvatarPreviewSrc] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [myFollowing, setMyFollowing] = useState([]);

  const [showUserListModal, setShowUserListModal] = useState(null);
  const [userList, setUserList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [bio, setBio] = useState('');
  const [accountName, setAccountName] = useState('');

  const profileEmail = paramEmail || currentUser?.email;
  const isOwnProfile = currentUser && profileEmail === currentUser.email;

  const fetchUser = async (email) => {
    if (!email) return null;
    try {
      const res = await fetch(`${API_URL}/users/${email}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const hydrateProfile = (userData, fallbackUser) => {
    const fallbackName = fallbackUser?.displayName || 'Weme Pet Member';
    const storedName = fallbackUser?.email ? localStorage.getItem(`wemepet-name-${fallbackUser.email}`) : null;
    const storedBio = fallbackUser?.email ? localStorage.getItem(`wemepet-bio-${fallbackUser.email}`) : null;

    const merged = {
      email: fallbackUser?.email || userData?.email || '',
      displayName: userData?.displayName || storedName || fallbackName,
      bio: userData?.bio || storedBio || '',
      photoURL: userData?.photoURL || fallbackUser?.photoURL || '',
      followers: userData?.followers || [],
      following: userData?.following || [],
    };

    return merged;
  };

  const fetchProfile = async () => {
    if (!profileEmail && !currentUser) return;

    const userData = await fetchUser(profileEmail);
    const currentData = currentUser?.email ? await fetchUser(currentUser.email) : null;

    if (currentData) {
      setMyFollowing(currentData.following || []);
    } else if (currentUser?.email) {
      setMyFollowing(currentUser?.following || []);
    }

    if (!userData && !isOwnProfile) {
      setNotFound(true);
      setProfileUser(null);
      return;
    }

    setNotFound(false);
    const hydrated = hydrateProfile(userData, isOwnProfile ? currentUser : null);
    setProfileUser(hydrated);
    setAccountName(hydrated.displayName || 'Weme Pet Member');
    setBio(hydrated.bio || '');
    setFollowersCount(hydrated.followers?.length || 0);
    setFollowingCount(hydrated.following?.length || 0);
    setAvatarPreviewSrc(hydrated.photoURL || '');
  };

  const fetchOwnerItems = () => {
    if (!profileEmail) return;
    fetch(`${API_URL}/feed?_t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        const safeData = Array.isArray(data) ? data : [];
        setAllItems(safeData);
        setOwnerItems(safeData.filter(item => item.owner === profileEmail));
      })
      .catch(err => {
        console.error(err);
        setAllItems([]);
        setOwnerItems([]);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, [profileEmail, currentUser?.email]);

  useEffect(() => {
    fetchOwnerItems();
  }, [profileEmail]);

  useEffect(() => {
    if (!avatarFile) setAvatarPreviewSrc(profileUser?.photoURL || '');
  }, [profileUser?.photoURL, avatarFile]);

  useEffect(() => () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
  }, [previewBlobUrl]);

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    let fileToUse = file;
    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImage(file);
        fileToUse = await cropImageToSquare(compressed);
      } catch (e) {
        console.error(e);
      }
    }

    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    const objectUrl = URL.createObjectURL(fileToUse);
    setPreviewBlobUrl(objectUrl);
    setAvatarPreviewSrc(objectUrl);
    setAvatarFile(fileToUse);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return toast('Vui lòng chọn ảnh trước!', 'error');
    if (!currentUser) return;
    setAvatarUploading(true);
    try {
      const payload = new FormData();
      payload.append('avatar', avatarFile);
      payload.append('email', currentUser.email);

      const res = await fetch(`${API_URL}/avatar`, { method: 'POST', body: payload });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const avatarUrl = getImageUrl(data.avatarUrl);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: avatarUrl });
        setUser((prev) => (prev ? { ...prev, photoURL: avatarUrl } : prev));
      }

      await fetch(`${API_URL}/users/${currentUser.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoURL: avatarUrl })
      }).catch(() => {});

      setAvatarFile(null);
      setAvatarPreviewSrc(avatarUrl);
      setShowAvatarModal(false);
      toast('Ảnh đại diện đã được cập nhật!', 'success');
    } catch (err) {
      console.error(err);
      toast(`Lỗi cập nhật avatar: ${err.message}`, 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAccountSave = async ({ name, bio: newBio }) => {
    if (!currentUser) return;
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name || 'Weme Pet Member' });
        setUser((prev) => (prev ? { ...prev, displayName: name } : prev));
      }

      await fetch(`${API_URL}/users/${currentUser.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name, bio: newBio })
      });

      localStorage.setItem(`wemepet-name-${currentUser.email}`, name || 'Weme Pet Member');
      localStorage.setItem(`wemepet-bio-${currentUser.email}`, newBio || '');

      setAccountName(name || 'Weme Pet Member');
      setBio(newBio || '');
      toast('Thông tin tài khoản đã được lưu!', 'success');
    } catch (err) {
      console.error(err);
      toast(`Lỗi lưu thông tin: ${err.message}`, 'error');
    }
  };

  const handleToggleFollow = (targetEmail) => {
    if (!currentUser) return toast('Vui lòng đăng nhập!', 'error');

    const isFollowingTarget = myFollowing.includes(targetEmail);
    const action = isFollowingTarget ? 'unfollow' : 'follow';

    setMyFollowing(prev => isFollowingTarget ? prev.filter(e => e !== targetEmail) : [...prev, targetEmail]);

    if (profileUser && profileUser.email === targetEmail) {
      setFollowersCount(prev => isFollowingTarget ? Math.max(0, prev - 1) : prev + 1);
    }

    if (isOwnProfile) {
      setFollowingCount(prev => isFollowingTarget ? Math.max(0, prev - 1) : prev + 1);
    }

    fetch(`${API_URL}/users/${targetEmail}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerEmail: currentUser.email })
    }).catch(err => console.error(err));
  };

  const fetchUserList = async (emails) => {
    if (!emails || emails.length === 0) {
      setUserList([]);
      return;
    }
    setLoadingList(true);
    try {
      const res = await fetch(`${API_URL}/users/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails })
      });
      const data = await res.json();
      setUserList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  const openUserList = (type) => {
    if (!profileUser) return;
    setSearchQuery('');
    setShowUserListModal(type);
    fetchUserList(type === 'followers' ? profileUser.followers : profileUser.following);
  };

  const handleUserClick = (email) => {
    setShowUserListModal(null);
    navigate(`/profile/${email}`);
  };

  const getDisplayItems = () => {
    if (!profileUser) return [];
    if (activeTab === 'saved') {
      return allItems.filter(item => item.bookmarks && item.bookmarks.includes(profileUser.email));
    }
    if (activeTab === 'private') {
      return ownerItems.filter(item => item.isPublic === false);
    }
    return ownerItems;
  };

  const filteredItems = getDisplayItems();
  const isFollowedBy = currentUser && profileUser?.following?.includes(currentUser.email);
  const isFollowingProfile = currentUser && myFollowing.includes(profileUser?.email);

  if (!profileEmail && !currentUser) {
    return (
      <div className="empty-state">
        <span className="material-symbols-outlined empty-state-icon">lock</span>
        <p className="empty-state-text">Vui lòng đăng nhập để xem hồ sơ.</p>
      </div>
    );
  }
  if (notFound) return <div className="feed-loading">Không tìm thấy hồ sơ người dùng.</div>;
  if (!profileUser) return <div className="feed-loading">Đang tải hồ sơ...</div>;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar">
            {avatarPreviewSrc ? <img src={avatarPreviewSrc} alt="Avatar" /> : <span>{profileUser.email?.[0]?.toUpperCase()}</span>}
          </div>
          {isOwnProfile && (
            <button type="button" className="avatar-camera-button" onClick={() => setShowAvatarModal(true)}>
              <span className="material-symbols-outlined">photo_camera</span>
            </button>
          )}
        </div>

        <div className="profile-info">
          <div className="profile-name-row">
            <h1 className="profile-name">{accountName || 'Weme Pet Member'}</h1>
            <div className="profile-actions">
              {isOwnProfile ? (
                <>
                  <button type="button" className="btn secondary small" onClick={() => setShowEditAccountModal(true)}>Chỉnh sửa trang cá nhân</button>
                  <button type="button" className="btn ghost icon-only" onClick={() => navigate('/settings')}><span className="material-symbols-outlined">settings</span></button>
                </>
              ) : (
                <button type="button" className={`btn ${isFollowingProfile ? 'secondary' : 'primary'} small`} onClick={() => handleToggleFollow(profileUser.email)}>
                  {isFollowingProfile ? 'Đang theo dõi' : (isFollowedBy ? 'Theo dõi lại' : 'Theo dõi')}
                </button>
              )}
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-item"><strong>{ownerItems.length}</strong> bài viết</div>
            <div className="stat-item clickable" onClick={() => openUserList('followers')}>
              <strong>{followersCount}</strong> người theo dõi
            </div>
            <div className="stat-item clickable" onClick={() => openUserList('following')}>
              <strong>{followingCount}</strong> đang theo dõi
            </div>
          </div>

          <div className="profile-bio">
            <div className="profile-email">{profileUser.email}</div>
            {bio && <div className="profile-bio-text">{bio}</div>}
          </div>
        </div>
      </div>

      {showAvatarModal && (
        <FullscreenModal onClose={() => setShowAvatarModal(false)} hideCloseButton>
          <AvatarUploadPopup
            avatarFile={avatarFile}
            avatarUploading={avatarUploading}
            avatarPreviewSrc={avatarPreviewSrc}
            onFileChange={handleAvatarFileChange}
            onUpload={handleAvatarUpload}
            onClose={() => setShowAvatarModal(false)}
          />
        </FullscreenModal>
      )}

      {showEditAccountModal && currentUser && (
        <FullscreenModal onClose={() => setShowEditAccountModal(false)} hideCloseButton>
          <AccountEditPopup
            displayName={currentUser.displayName}
            email={currentUser.email}
            bio={bio}
            onSave={handleAccountSave}
            onClose={() => setShowEditAccountModal(false)}
          />
        </FullscreenModal>
      )}

      {showUserListModal && (
        <FullscreenModal onClose={() => setShowUserListModal(null)} hideCloseButton>
          <UserListPopup
            title={showUserListModal === 'followers' ? 'Người theo dõi' : 'Đang theo dõi'}
            users={userList}
            loading={loadingList}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClose={() => setShowUserListModal(null)}
            onUserClick={handleUserClick}
            currentUserEmail={currentUser?.email}
            myFollowing={myFollowing}
            onToggleFollow={handleToggleFollow}
          />
        </FullscreenModal>
      )}

      <div className="profile-nav-tabs">
        <button className={`nav-tab ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>
          <span className="material-symbols-outlined">grid_on</span>
          <span>BÀI VIẾT</span>
        </button>
        <button className={`nav-tab ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setActiveTab('saved')}>
          <span className="material-symbols-outlined">bookmark_border</span>
          <span>ĐÃ LƯU</span>
        </button>
        {isOwnProfile && (
          <button className={`nav-tab ${activeTab === 'private' ? 'active' : ''}`} onClick={() => setActiveTab('private')}>
            <span className="material-symbols-outlined">lock</span>
            <span>RIÊNG TƯ</span>
          </button>
        )}
      </div>

      <div className="profile-content">
        <div className="profile-grid">
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined empty-state-icon">water_drop</span>
              <p className="empty-state-text">
                {isOwnProfile ? 'Hồ cá của bạn chưa có bài viết nào.' : 'Người dùng này chưa có bài viết nào.'}
              </p>
              {isOwnProfile && (
                <button className="btn primary" onClick={() => document.querySelector('.sidebar-item:nth-child(2)')?.click()}>
                  Thêm hồ sơ mới
                </button>
              )}
            </div>
          ) : (
            filteredItems.map(item => {
              const isKoiIdentity = item.type === 'koi_identity' || (item.id && item.id.startsWith('KOI-'));
              const imageSrc = getImageUrl(item.img || item.images?.[0]);

              return (
                <div
                  key={item.id}
                  className="profile-card-mini"
                  onClick={() => {
                    if (isOwnProfile && isKoiIdentity) setEditingKoi(item);
                    else navigate(isKoiIdentity ? `/koi/${item.id}` : `/post/${item.id}`);
                  }}
                >
                  <img src={imageSrc} alt={item.name} />
                  <div className="profile-card-overlay">
                    <div className="profile-card-overlay-item">
                      <span className="material-symbols-outlined filled">favorite</span>
                      {item.likes?.length || 0}
                    </div>
                    <div className="profile-card-overlay-item">
                      <span className="material-symbols-outlined filled">chat_bubble</span>
                      {item.comments?.length || 0}
                    </div>
                  </div>
                  {item.isPublic === false && (
                    <div className="profile-card-lock">
                      <span className="material-symbols-outlined">lock</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {editingKoi && (
        <FullscreenModal onClose={() => setEditingKoi(null)} hideCloseButton>
          <EditKoiPopup koi={editingKoi} onUpdate={() => { setEditingKoi(null); fetchOwnerItems(); }} onClose={() => setEditingKoi(null)} />
        </FullscreenModal>
      )}
    </div>
  );
};

export default ProfilePage;
