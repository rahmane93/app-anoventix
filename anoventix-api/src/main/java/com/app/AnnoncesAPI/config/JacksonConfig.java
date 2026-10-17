package com.app.AnnoncesAPI.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Configuration
public class JacksonConfig {

    private static final DateTimeFormatter UTC_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    @Bean
    SimpleModule localDateTimeUtcModule() {
        SimpleModule module = new SimpleModule("LocalDateTimeUtc");
        module.addSerializer(LocalDateTime.class, new LocalDateTimeUtcSerializer());
        module.addDeserializer(LocalDateTime.class, new LocalDateTimeUtcDeserializer());
        return module;
    }

    static class LocalDateTimeUtcSerializer extends StdSerializer<LocalDateTime> {
        LocalDateTimeUtcSerializer() { super(LocalDateTime.class); }

        @Override
        public void serialize(LocalDateTime value, JsonGenerator gen, SerializerProvider provider)
                throws IOException {
            gen.writeString(UTC_FORMATTER.format(value));
        }
    }

    static class LocalDateTimeUtcDeserializer extends StdDeserializer<LocalDateTime> {
        LocalDateTimeUtcDeserializer() { super(LocalDateTime.class); }

        @Override
        public LocalDateTime deserialize(JsonParser p, DeserializationContext ctx)
                throws IOException {
            String text = p.getText().trim();
            if (text.endsWith("Z")) {
                text = text.substring(0, text.length() - 1);
            }
            return LocalDateTime.parse(text, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        }
    }
}
