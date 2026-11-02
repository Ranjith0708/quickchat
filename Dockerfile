
# Stage 1: Build using Maven 3.9.6 and Java 21
FROM maven:3.9.6-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests

# Stage 2: Run using Java 21
FROM eclipse-temurin:21.0.2_13-jre

WORKDIR /app

COPY --from=build /app/target/quickchat-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8088

ENTRYPOINT ["java", "-jar", "app.jar"]