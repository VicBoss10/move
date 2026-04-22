package com.jade.move.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC configuration for async support and task executor settings.
 *
 * <p>Configures async request handling to allow long-lived streaming connections
 * without being interrupted by the framework default timeout. Also registers a
 * dedicated thread pool executor for async tasks.</p>
 *
 * @since 0.0.1
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * Configure async support with a dedicated thread pool and infinite default timeout.
     *
     * @param configurer the AsyncSupportConfigurer to customize
     * @implNote The default timeout is set to 0 (infinite) to prevent termination of
     * long-lived streaming connections (for example MJPEG streams). A ThreadPoolTaskExecutor
     * is used to provide a bounded pool of threads for async tasks.
     */
    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        configurer.setDefaultTimeout(0);

        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();

        configurer.setTaskExecutor(executor);
    }
}
