package com.jade.move;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MoveApplication {

	public static void main(String[] args) {
		SpringApplication.run(MoveApplication.class, args);
	}

}
