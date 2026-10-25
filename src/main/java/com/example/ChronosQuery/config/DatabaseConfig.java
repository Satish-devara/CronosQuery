package com.example.ChronosQuery.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${spring.datasource.url:}")
    private String configuredUrl;

    @Value("${spring.datasource.username:postgres}")
    private String configuredUsername;

    @Value("${spring.datasource.password:postgres}")
    private String configuredPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();

        // Check environment variables: SPRING_DATASOURCE_URL, DATABASE_URL, INTERNAL_DATABASE_URL
        String rawUrl = System.getenv("SPRING_DATASOURCE_URL");
        if (rawUrl == null || rawUrl.isBlank()) {
            rawUrl = System.getenv("DATABASE_URL");
        }
        if (rawUrl == null || rawUrl.isBlank()) {
            rawUrl = System.getenv("INTERNAL_DATABASE_URL");
        }
        if (rawUrl == null || rawUrl.isBlank()) {
            rawUrl = configuredUrl;
        }

        String username = configuredUsername;
        String password = configuredPassword;
        String jdbcUrl;

        // Auto-convert Render's postgres:// or postgresql:// format to jdbc:postgresql://
        if (rawUrl != null && (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://"))) {
            try {
                URI uri = new URI(rawUrl);
                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    username = parts[0];
                    password = parts[1];
                }
                int port = uri.getPort() != -1 ? uri.getPort() : 5432;
                String path = uri.getPath();
                jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + port + path;

                if (uri.getHost() != null && uri.getHost().contains("render.com")
                        && (uri.getQuery() == null || !uri.getQuery().contains("sslmode"))) {
                    jdbcUrl += "?sslmode=require";
                }
            } catch (Exception e) {
                log.warn("Could not parse database URI as URI object, fallback string replace: {}", e.getMessage());
                jdbcUrl = rawUrl.replaceFirst("^postgres(ql)?://", "jdbc:postgresql://");
            }
        } else if (rawUrl != null && rawUrl.startsWith("jdbc:postgresql://")) {
            jdbcUrl = rawUrl;
            String envUser = System.getenv("SPRING_DATASOURCE_USERNAME");
            if (envUser != null && !envUser.isBlank()) username = envUser;
            String envPass = System.getenv("SPRING_DATASOURCE_PASSWORD");
            if (envPass != null && !envPass.isBlank()) password = envPass;
        } else {
            jdbcUrl = (rawUrl != null && !rawUrl.isBlank()) ? rawUrl : "jdbc:postgresql://localhost:5432/chronos_db";
        }

        log.info("Initializing DataSource connecting to: {}", jdbcUrl);
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setDriverClassName("org.postgresql.Driver");

        return new HikariDataSource(config);
    }
}
