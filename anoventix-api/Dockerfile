# Build stage
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Optimisation du cache des dépendances Maven
COPY pom.xml .
RUN mvn dependency:go-offline

# Build de l'application
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-alpine

# Création utilisateur non-root pour la sécurité
RUN addgroup -S spring && adduser -S spring -G spring

WORKDIR /app

# Création du dossier uploads avec les bonnes permissions
RUN mkdir -p /app/uploads && chown -R spring:spring /app

# Copie du jar
COPY --from=build /app/target/*.jar app.jar
RUN chown spring:spring app.jar

USER spring

# Profil par défaut pour les conteneurs : prod (override via docker-compose).
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]