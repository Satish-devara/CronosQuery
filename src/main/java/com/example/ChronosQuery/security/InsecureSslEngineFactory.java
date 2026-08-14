package com.example.ChronosQuery.security;

import org.apache.kafka.common.security.auth.SslEngineFactory;
import javax.net.ssl.*;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.security.KeyStore;
import java.util.Map;
import java.util.Set;

public class InsecureSslEngineFactory implements SslEngineFactory {

    private final TrustManager[] INSECURE_TRUST_MANAGERS = new TrustManager[]{
        new X509TrustManager() {
            public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            public void checkClientTrusted(X509Certificate[] certs, String authType) {}
            public void checkServerTrusted(X509Certificate[] certs, String authType) {}
        }
    };

    @Override
    public SSLEngine createClientSslEngine(String peerHost, int peerPort, String endpointIdentification) {
        try {
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, INSECURE_TRUST_MANAGERS, new SecureRandom());
            SSLEngine engine = sslContext.createSSLEngine(peerHost, peerPort);
            engine.setUseClientMode(true);
            return engine;
        } catch (Exception e) {
            throw new RuntimeException("Failed to create insecure SSL context", e);
        }
    }

    @Override
    public SSLEngine createServerSslEngine(String peerHost, int peerPort) {
        return null;
    }

    @Override
    public boolean shouldBeRebuilt(Map<String, Object> nextConfigs) {
        return false;
    }

    @Override
    public Set<String> reconfigurableConfigs() {
        return Set.of();
    }

    @Override
    public void configure(Map<String, ?> configs) {}

    @Override
    public KeyStore keystore() {
        return null;
    }

    @Override
    public KeyStore truststore() {
        return null;
    }

    @Override
    public void close() {}
}
