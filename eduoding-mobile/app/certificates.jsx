// eduoding-mobile/app/certificates.jsx - CertificatePage
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import API from "../services/api";
import Constants from "expo-constants";

function CertificateCard({ cert, onView, onShowQR }) {
  const label = cert.courseTitle || `Course ${cert.courseId || ""}`;
  const issued = cert.createdAt ? new Date(cert.createdAt) : null;

  return (
    <View style={styles.certCard}>
      <View style={styles.certPreview}>
        {cert.pdfUrl ? (
          <WebView
            source={{ uri: cert.pdfUrl + "#view=fitH&zoom=50" }}
            style={styles.previewWebView}
          />
        ) : (
          <View style={styles.noPreview}>
            <Text style={styles.noPreviewText}>No preview</Text>
          </View>
        )}
      </View>

      <View style={styles.certInfo}>
        <Text style={styles.certTitle}>{label}</Text>
        <Text style={styles.certDate}>
          Issued:{" "}
          {issued
            ? issued.toLocaleDateString() + " " + issued.toLocaleTimeString()
            : "—"}
        </Text>
        {cert.score != null && (
          <Text style={styles.certScore}>
            Score: <Text style={styles.certScoreBold}>{cert.score}%</Text>
          </Text>
        )}
        {cert.certificateId && (
          <Text style={styles.certId}>
            Certificate ID: {cert.certificateId}
          </Text>
        )}

        <View style={styles.certActions}>
          <Pressable style={styles.viewButton} onPress={() => onView(cert)}>
            <Text style={styles.viewButtonText}>View</Text>
          </Pressable>

          {cert.pdfUrl ? (
            <>
              <Pressable
                style={styles.actionButton}
                onPress={() => Linking.openURL(cert.pdfUrl)}
              >
                <Text style={styles.actionButtonText}>Open</Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={async () => {
                  try {
                    await Linking.openURL(cert.pdfUrl);
                  } catch (err) {
                    Alert.alert("Error", "Failed to open PDF");
                  }
                }}
              >
                <Text style={styles.actionButtonText}>Download</Text>
              </Pressable>
            </>
          ) : (
            <View style={[styles.actionButton, styles.actionButtonDisabled]}>
              <Text style={styles.actionButtonTextDisabled}>No PDF</Text>
            </View>
          )}

          <Pressable style={styles.qrButton} onPress={() => onShowQR(cert)}>
            <Text style={styles.qrButtonText}>QR / Verify</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ViewerModal({ cert, onClose }) {
  if (!cert) return null;
  const pdfUrl = cert.pdfUrl;
  const title = cert.courseTitle || `Certificate`;

  const handleDownload = async () => {
    if (!pdfUrl) return;
    try {
      await Linking.openURL(pdfUrl);
    } catch (err) {
      Alert.alert("Error", "Failed to open PDF");
    }
  };

  return (
    <Modal
      visible={!!cert}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalSubtitle}>
                {cert.userName || cert.username || ""}
              </Text>
            </View>
            <View style={styles.modalHeaderActions}>
              {pdfUrl && (
                <>
                  <Pressable
                    style={styles.modalButton}
                    onPress={handleDownload}
                  >
                    <Text style={styles.modalButtonText}>Open</Text>
                  </Pressable>
                  <Pressable
                    style={styles.modalButton}
                    onPress={handleDownload}
                  >
                    <Text style={styles.modalButtonText}>Download</Text>
                  </Pressable>
                </>
              )}
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.pdfContainer}>
            {pdfUrl ? (
              <WebView
                source={{ uri: pdfUrl + "#view=FitH" }}
                style={styles.pdfWebView}
              />
            ) : (
              <View style={styles.noPdfContainer}>
                <Text style={styles.noPdfText}>
                  No certificate PDF available for preview.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function QRModal({ cert, onClose }) {
  if (!cert) return null;

  const appUrl =
    Constants.expoConfig?.extra?.FRONTEND_URL || "https://eduoding.com";
  const id = cert.certificateId || cert._id || cert.id;
  const verifyUrl = `${appUrl}/verify-certificate/${encodeURIComponent(id)}`;
  const qrImg = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(
    verifyUrl
  )}`;

  const handleCopy = () => {
    Alert.alert("Verify URL", verifyUrl, [{ text: "OK" }]);
  };

  return (
    <Modal
      visible={!!cert}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.qrModalContent}>
          <Text style={styles.qrModalTitle}>Verify certificate</Text>
          <Text style={styles.qrModalUrl} numberOfLines={3}>
            {verifyUrl}
          </Text>
          <View style={styles.qrContainer}>
            <Image source={{ uri: qrImg }} style={styles.qrImage} />
            <View style={styles.qrActions}>
              <Pressable style={styles.qrCopyButton} onPress={handleCopy}>
                <Text style={styles.qrCopyButtonText}>Copy link</Text>
              </Pressable>
              <Pressable
                style={styles.qrOpenButton}
                onPress={() => Linking.openURL(verifyUrl)}
              >
                <Text style={styles.qrOpenButtonText}>Open verify page</Text>
              </Pressable>
            </View>
          </View>
          <Pressable style={styles.qrCloseButton} onPress={onClose}>
            <Text style={styles.qrCloseButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function CertificatePage() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [activeCert, setActiveCert] = useState(null);
  const [qrCert, setQrCert] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchCerts = async () => {
      setLoading(true);
      setError(null);
      try {
        let res;
        try {
          res = await API.get("/certificates/me");
        } catch (e) {
          res = await API.get("/quiz/certificates/all");
        }

        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.certificates || res.data || [];
        if (mounted) {
          const normalized = data.map((c) => ({
            _id: c._id || c.id,
            courseId: c.courseId || c.course || null,
            courseTitle:
              c.courseTitle ||
              c.title ||
              (c.course && (c.course.title || c.course.name)) ||
              `Course ${c.courseId || ""}`,
            pdfUrl: c.pdfUrl || c.url || c.fileUrl || c.pdf || null,
            createdAt: c.createdAt || c.issuedAt || c.createdAt,
            score: c.score ?? c.percent ?? null,
            userName: c.userName || c.username || c.name || "",
            certificateId:
              c.certificateId || c.certificateId || c.certId || null,
          }));
          setCerts(normalized);
        }
      } catch (err) {
        console.error("Failed to fetch certificates:", err);
        if (mounted) {
          setError(
            err.response?.data?.message || err.message || "Failed to load"
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchCerts();
    return () => (mounted = false);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎓 My Certificates</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6c63ff" />
          <Text style={styles.loadingText}>Loading certificates…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : certs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No certificates yet. Pass a quiz to earn one.
          </Text>
          <Pressable
            style={styles.browseButton}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.browseButtonText}>Browse Courses</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {certs.map((c) => (
            <CertificateCard
              key={c._id}
              cert={c}
              onView={(cert) => setActiveCert(cert)}
              onShowQR={(cert) => setQrCert(cert)}
            />
          ))}
        </ScrollView>
      )}

      <ViewerModal cert={activeCert} onClose={() => setActiveCert(null)} />
      <QRModal cert={qrCert} onClose={() => setQrCert(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#ff4d4f",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  browseButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
  },
  browseButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  certCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  certPreview: {
    width: 144,
    height: 192,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  previewWebView: {
    flex: 1,
  },
  noPreview: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noPreviewText: {
    fontSize: 12,
    color: "#999",
  },
  certInfo: {
    flex: 1,
  },
  certTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginBottom: 4,
  },
  certDate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  certScore: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  certScoreBold: {
    fontWeight: "700",
  },
  certId: {
    fontSize: 10,
    color: "#999",
    marginBottom: 12,
  },
  certActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#6c63ff",
    borderRadius: 6,
  },
  viewButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: "#333",
    fontSize: 12,
  },
  actionButtonTextDisabled: {
    color: "#999",
  },
  qrButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
  },
  qrButtonText: {
    color: "#333",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    maxWidth: 800,
    maxHeight: "90%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  modalHeaderActions: {
    flexDirection: "row",
    gap: 8,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
  },
  modalButtonText: {
    fontSize: 12,
    color: "#333",
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    marginLeft: 8,
  },
  closeButtonText: {
    fontSize: 12,
    color: "#333",
  },
  pdfContainer: {
    height: "80%",
    minHeight: 400,
    backgroundColor: "#f0f0f0",
  },
  pdfWebView: {
    flex: 1,
  },
  noPdfContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  noPdfText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  qrModalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginBottom: 12,
  },
  qrModalUrl: {
    fontSize: 12,
    color: "#666",
    marginBottom: 16,
  },
  qrContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  qrImage: {
    width: 150,
    height: 150,
  },
  qrActions: {
    flex: 1,
    gap: 8,
  },
  qrCopyButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
    alignItems: "center",
  },
  qrCopyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  qrOpenButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    alignItems: "center",
  },
  qrOpenButtonText: {
    color: "#333",
    fontSize: 14,
  },
  qrCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    alignItems: "center",
  },
  qrCloseButtonText: {
    color: "#333",
    fontSize: 14,
  },
});
