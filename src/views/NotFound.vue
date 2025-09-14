<template>
  <div class="not-found">
    <h1>404</h1>
    <p>Oops! The page you are looking for does not exist.</p>
    <router-link to="/">Go Back Home</router-link>
  </div>
</template>

<script>
export default {
  name: "NotFound",
};
</script>

<style scoped>
.not-found {
  text-align: center;
  margin-top: 50px;
}
.not-found h1 {
  font-size: 6rem;
  color: rgb(29, 157, 216);
  margin-bottom: 5px;
}
.not-found p {
  font-size: 1.2rem;
  margin-bottom: 5px;
}
</style>
