import React, { useEffect, useState } from 'react';
import { SafeAreaView, FlatList, Text, View, ActivityIndicator, StyleSheet } from 'react-native';

const API_URL = 'https://app.newsonafrica.com/api/posts';

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setPosts(data.posts || []);
      })
      .catch(err => {
        console.error('Failed to fetch posts', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16
  },
  item: {
    marginBottom: 12
  },
  title: {
    fontSize: 18
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
