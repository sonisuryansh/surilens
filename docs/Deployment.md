# 🚀 Deployment Configurations

## Docker Setup

Expose port `4444` in your `Dockerfile` to allow access to the SuriLens dashboard:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000 4444
CMD ["node", "server.js"]
```

---

## Kubernetes Setup

Define a service port for `dashboard-port` (`4444`):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-backend-service
spec:
  ports:
    - name: http
      port: 3000
      targetPort: 3000
    - name: surilens-dashboard
      port: 4444
      targetPort: 4444
  selector:
    app: my-backend
```
