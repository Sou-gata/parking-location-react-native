package com.gbt.parkverse

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.OkHttpClient
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    OkHttpClientProvider.setOkHttpClientFactory(UnsafeOkHttpClientFactory())
    super.onCreate()
    loadReactNative(this)
  }
}

class UnsafeOkHttpClientFactory : OkHttpClientFactory {
  override fun createNewNetworkModuleClient(): OkHttpClient {
    try {
      val trustAllCerts = arrayOf<TrustManager>(
        object : X509TrustManager {
          @Throws(CertificateException::class)
          override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}

          @Throws(CertificateException::class)
          override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}

          override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
        }
      )

      val sslContext = SSLContext.getInstance("SSL")
      sslContext.init(null, trustAllCerts, java.security.SecureRandom())
      val sslSocketFactory = sslContext.socketFactory

      val builder = OkHttpClientProvider.createClientBuilder()
      builder.sslSocketFactory(sslSocketFactory, trustAllCerts[0] as X509TrustManager)
      builder.hostnameVerifier { _, _ -> true }

      return builder.build()
    } catch (e: Exception) {
      throw RuntimeException(e)
    }
  }
}
