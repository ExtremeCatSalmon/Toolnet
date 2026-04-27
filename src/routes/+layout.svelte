<script lang="ts">
  import favicon from "$lib/assets/favicon.png";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Toolnet</title>
</svelte:head>

<header>
  <a href="/">home</a>
  <a href="/about">about</a>
</header>
{@render children()}

<style>
  :global(body) {
    margin: 1px;
    padding: 1px;
    background-color: #282828;
	overflow: hidden;
  }
  header {
    position: fixed;
    margin: 0;
    padding: 0;
  }
</style>
