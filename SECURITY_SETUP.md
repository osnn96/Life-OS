# Security Rules Deployment Guide

## ÖNEMLİ: Firestore Güvenlik Kurallarını Güncelleme

Kullanıcıların birbirlerinin verilerini görmesi sorununu çözmek için Firestore güvenlik kurallarını güncellemeniz gerekmektedir.

### Adım 1: Firebase Console'a Git
1. [Firebase Console](https://console.firebase.google.com/) adresine git
2. Projenizi seçin

### Adım 2: Firestore Güvenlik Kurallarını Güncelle
1. Sol menüden "Firestore Database" seçeneğine tıklayın
2. Üst menüden "Rules" (Kurallar) sekmesine tıklayın
3. Aşağıdaki kuralları kopyalayıp yapıştırın:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Tasks collection - users can only access their own tasks
    match /tasks/{taskId} {
      allow read, write: if isSignedIn() && isOwner(resource.data.userId);
      allow create: if isSignedIn() && isOwner(request.resource.data.userId);
    }
    
    // Jobs collection - users can only access their own job applications
    match /jobs/{jobId} {
      allow read, write: if isSignedIn() && isOwner(resource.data.userId);
      allow create: if isSignedIn() && isOwner(request.resource.data.userId);
    }
    
    // Masters collection - users can only access their own master applications
    match /masters/{masterId} {
      allow read, write: if isSignedIn() && isOwner(resource.data.userId);
      allow create: if isSignedIn() && isOwner(request.resource.data.userId);
    }
    
    // Erasmus collection - users can only access their own erasmus internships
    match /erasmus/{erasmusId} {
      allow read, write: if isSignedIn() && isOwner(resource.data.userId);
      allow create: if isSignedIn() && isOwner(request.resource.data.userId);
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. "Publish" (Yayınla) butonuna tıklayın

### Adım 3: Firebase CLI ile Güncelleme (Alternatif)
Eğer Firebase CLI kullanıyorsanız:

```bash
# Firebase CLI'yi yükleyin (eğer yüklü değilse)
npm install -g firebase-tools

# Projenize giriş yapın
firebase login

# Firebase projenizi başlatın (eğer daha önce yapmadıysanız)
firebase init firestore

# firestore.rules dosyasını deploy edin
firebase deploy --only firestore:rules
```

## Yapılan Değişiklikler

### 1. Job Tracker - "Rejected" Durumu Eklendi
- Job applications için "REJECTED" durumu eklendi
- Reddedilen başvurular ayrı bir "Rejected Applications" bölümünde gösteriliyor
- Reddedilen başvurular aktif başvurulardan ayrı tutularak karışıklık önlendi

### 2. Master Tracker - "Done" ve "Rejected" Bölümleri Eklendi
- Master applications için "isDone" ve "isRejected" alanları eklendi
- Kabul edilen başvurular "Accepted Applications" bölümünde (yeşil)
- Reddedilen başvurular "Rejected Applications" bölümünde (kırmızı)
- Her başvuru için "✓ Done" (kabul edildi) ve "✗ Rejected" (reddedildi) butonları eklendi
- İstediğiniz zaman başvuruları tekrar aktif duruma döndürebilirsiniz

### 3. Kullanıcı Verisi Güvenlik Sorunu Çözüldü
- Firestore güvenlik kuralları eklendi
- Her kullanıcı sadece kendi verilerini görebilir ve düzenleyebilir
- Kimlik doğrulaması olmayan kullanıcılar hiçbir veriye erişemez

## Test Etme

1. Firestore kurallarını deploy ettikten sonra uygulamayı yenileyin
2. Farklı hesaplarla giriş yaparak her kullanıcının sadece kendi verilerini gördüğünü doğrulayın
3. Job applications sayfasında "Rejected" durumunu seçerek test edin
4. Master applications sayfasında "✓ Done" ve "✗ Rejected" butonlarını test edin

## Sorun Giderme

Eğer hala kullanıcılar birbirlerinin verilerini görüyorsa:
1. Firebase Console'da kuralların doğru deploy edildiğini kontrol edin
2. Tarayıcı önbelleğini temizleyin
3. Kullanıcıların logout yapıp tekrar login olmalarını sağlayın
4. Firebase Console'da Firestore Database'de Rules sekmesinde "Simulator" ile kuralları test edin
