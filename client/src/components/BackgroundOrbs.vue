<template>
  <div class="orbs-root" aria-hidden="true">
    <div class="orb orb-violet" />
    <div class="orb orb-fuchsia" />
    <div class="orb orb-indigo" />
  </div>
</template>

<style scoped>
.orbs-root {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
}
.orb-violet {
  width: 600px;
  height: 600px;
  top: -100px;
  left: -100px;
  background: #7c3aed;
  opacity: 0.09;
}
.orb-fuchsia {
  width: 500px;
  height: 500px;
  bottom: -80px;
  right: -80px;
  background: #d946ef;
  opacity: 0.07;
}
.orb-indigo {
  width: 400px;
  height: 400px;
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
  background: #6366f1;
  opacity: 0.08;
}
</style>
