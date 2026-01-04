# Use a lightweight Python image with Playwright dependencies
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the scraper script and helpers
COPY trigger.py .
COPY storage_helper.py .

# Command to run the scraper
CMD ["python", "trigger.py"]
