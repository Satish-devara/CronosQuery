package com.example.ChronosQuery;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;

@SpringBootApplication(exclude = {RedisRepositoriesAutoConfiguration.class})
public class ChronosQueryApplication {

	public static void main(String[] args) {
		SpringApplication.run(ChronosQueryApplication.class, args);
	}

}
