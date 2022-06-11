import requests
 
url = "https://notify-api.line.me/api/notify"
#Groupのトークン
token = "RBLNNUDULaXOIxSUhSjHsStzPyk7cV6GNVVpw50XGh9"
headers = {"Authorization" : "Bearer " + token}
message = "You are sitting!"
payload = {"message" : message}
r = requests.post(url, headers = headers, params = payload)