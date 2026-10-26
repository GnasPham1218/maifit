#backend/Dockerfile

# ===== Stage 1: build file .jar using JDK =====
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
# Copy Maven Wrapper and pom.xml for caching dependency layer
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

RUN sed -i 's/\r$//' mvnw && chmod +x mvnw

# Download dependency
RUN ./mvnw -B dependency:go-offline

# Copy src and build file .jar
COPY src/ src/
RUN ./mvnw -B package -DskipTests


# ===== Stage 2: Running .jar by JRE =====
FROM eclipse-temurin:25-jre
WORKDIR /app

# Create user not root
RUN groupadd --system app && useradd --system --gid app --no-create-home app

# Copy .jar file from Stage 1's result
COPY --from=build /app/target/*.jar app.jar

USER app

EXPOSE 8080

# Config JVM using maximum 75$ RAM of Container
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

ENTRYPOINT ["java", "-jar", "app.jar"]